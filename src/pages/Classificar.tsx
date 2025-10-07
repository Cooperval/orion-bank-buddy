import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Calendar as CalendarIcon,
  Save,
  Download,
  Check,
  Clock,
  Settings,
  Plus,
  TreePine,
  FileSpreadsheet,
  Filter,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CommitmentHierarchy } from "@/components/CommitmentHierarchy";

// Types
interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  transaction_type: "credit" | "debit";
  memo?: string;
  bank_id: string;
  company_id: string;
  balance?: number;
  fitid?: string;
  ofx_import_date?: string;
  created_at: string;
  updated_at: string;
  classification?: {
    id: string;
    group_name: string;
    group_color: string;
    commitment_name?: string;
    type_name?: string;
  };
}

interface NFeDocument {
  id: string;
  nfe_number: string;
  serie: string;
  emission_date: string;
  operation_nature: string;
  cfop: string;
  total_nfe_value: number;
  company_id: string;
  created_at: string;
  nfe_emitters: Array<{
    cnpj: string;
    razao_social: string;
  }>;
  nfe_recipients: Array<{
    cnpj: string;
    razao_social: string;
  }>;
  classification?: {
    id: string;
    group_name: string;
    group_color: string;
    commitment_name?: string;
    type_name?: string;
  };
}

interface ClassificationRule {
  id: string;
  rule_name: string;
  description_contains: string;
  commitment_group_id?: string;
  commitment_id?: string;
  commitment_type_id?: string;
  is_active: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
}

interface CommitmentGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
  company_id: string;
}

interface Commitment {
  id: string;
  name: string;
  commitment_group_id: string;
  commitment_type_id?: string;
  company_id: string;
}

interface CommitmentType {
  id: string;
  name: string;
  company_id: string;
}

const TransactionClassification: React.FC = () => {
  // State for transactions and data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nfeDocuments, setNfeDocuments] = useState<NFeDocument[]>([]);
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [groups, setGroups] = useState<CommitmentGroup[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [types, setTypes] = useState<CommitmentType[]>([]);

  // Loading and UI states
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("unclassified");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Bulk classification state
  const [bulkGroup, setBulkGroup] = useState("");
  const [bulkCommitment, setBulkCommitment] = useState("");

  // Rule dialog state
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isEditRuleDialogOpen, setIsEditRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null);
  const [newRule, setNewRule] = useState({
    rule_name: "",
    description_contains: "",
    commitment_group_id: "",
    commitment_id: "",
    commitment_type_id: "",
  });

  // Hierarchy state
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // State para armazenar classificações pendentes (não salvas) de NFes
  const [pendingNFeClassifications, setPendingNFeClassifications] = useState<
    Record<
      string,
      {
        typeId?: string;
        groupId?: string;
        commitmentId?: string;
      }
    >
  >({});

  // Helper function to get current user's company_id
  const getUserCompanyId = async (): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar perfil: ${error.message}`);
    }

    if (!profile?.company_id) {
      throw new Error("Empresa do usuário não encontrada");
    }

    return profile.company_id;
  };

  useEffect(() => {
    fetchData();
    fetchHierarchy();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, selectedGroup, selectedStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, searchTerm, selectedGroup, selectedStatus, dateFrom, dateTo]);

  // Real-time updates for transactions, NFes and classifications
  useEffect(() => {
    const channel = supabase
      .channel("classification-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          fetchData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nfe_documents",
        },
        () => {
          fetchData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transaction_classifications",
        },
        () => {
          fetchData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ofx_uploads",
        },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Hierarchy functions
  const toggleType = (typeId: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId);
    } else {
      newExpanded.add(typeId);
    }
    setExpandedTypes(newExpanded);
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getFilteredHierarchy = () => {
    const filteredTypes = selectedTypeFilter === "all" ? types : types.filter((t) => t.id === selectedTypeFilter);

    // Create hierarchy: Type → Group → Commitment
    return filteredTypes
      .map((type) => {
        // Find commitments for this type - now using commitment_type_id
        const typeCommitments = commitments.filter((c) => c.commitment_type_id === type.id);

        // Group commitments by their groups
        const groupsForType = groups
          .filter((group) => typeCommitments.some((commitment) => commitment.commitment_group_id === group.id))
          .map((group) => ({
            ...group,
            commitments: typeCommitments.filter((c) => c.commitment_group_id === group.id),
          }));

        return {
          ...type,
          groups: groupsForType,
        };
      })
      .filter((type) => type.groups.length > 0); // Only show types that have groups/commitments
  };

  const fetchData = async () => {
    await Promise.all([fetchTransactions(), fetchNFes()]);
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const companyId = await getUserCompanyId();

      // First, get IDs of classified/unclassified transactions based on filter
      let transactionIdsQuery;

      if (selectedStatus === "classified") {
        // Get only transactions that have classifications
        const { data: classifiedIds } = await supabase
          .from("transaction_classifications")
          .select("transaction_id")
          .eq("company_id", companyId);

        const ids = classifiedIds?.map((c) => c.transaction_id) || [];

        // Build query with classification filter
        transactionIdsQuery = supabase
          .from("transactions")
          .select("id")
          .eq("company_id", companyId)
          .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]); // Use dummy UUID if no results
      } else if (selectedStatus === "unclassified") {
        // Get only transactions that DON'T have classifications
        const { data: classifiedIds } = await supabase
          .from("transaction_classifications")
          .select("transaction_id")
          .eq("company_id", companyId);

        const ids = classifiedIds?.map((c) => c.transaction_id) || [];

        transactionIdsQuery = supabase.from("transactions").select("id").eq("company_id", companyId);

        if (ids.length > 0) {
          transactionIdsQuery = transactionIdsQuery.not("id", "in", `(${ids.join(",")})`);
        }
      } else {
        // Get all transactions
        transactionIdsQuery = supabase.from("transactions").select("id").eq("company_id", companyId);
      }

      // Apply group filter if needed
      if (selectedGroup !== "all") {
        const { data: groupClassifications } = await supabase
          .from("transaction_classifications")
          .select("transaction_id")
          .eq("company_id", companyId)
          .eq("commitment_group_id", selectedGroup);

        const groupIds = groupClassifications?.map((c) => c.transaction_id) || [];

        if (groupIds.length > 0) {
          transactionIdsQuery = transactionIdsQuery.in("id", groupIds);
        } else {
          transactionIdsQuery = transactionIdsQuery.in("id", ["00000000-0000-0000-0000-000000000000"]);
        }
      }

      // Apply search and date filters to the ID query
      if (searchTerm) {
        transactionIdsQuery = transactionIdsQuery.ilike("description", `%${searchTerm}%`);
      }
      if (dateFrom) {
        transactionIdsQuery = transactionIdsQuery.gte("transaction_date", format(dateFrom, "yyyy-MM-dd"));
      }
      if (dateTo) {
        transactionIdsQuery = transactionIdsQuery.lte("transaction_date", format(dateTo, "yyyy-MM-dd"));
      }

      // Get filtered transaction IDs (remove 1000 limit by setting to 100000)
      const { data: filteredIds, error: idsError } = await transactionIdsQuery.limit(100000);

      if (idsError) {
        console.error("Error fetching filtered transaction IDs:", idsError);
        setTransactions([]);
        setTotalItems(0);
        return;
      }

      const transactionIds = filteredIds?.map((t) => t.id) || [];

      // Set total count based on filtered IDs
      setTotalItems(transactionIds.length);

      // If no transactions match filters, return early
      if (transactionIds.length === 0) {
        setTransactions([]);
        return;
      }

      // Apply pagination to the filtered IDs
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      const paginatedIds = transactionIds.slice(from, to + 1);

      // Fetch full transaction data for paginated IDs
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select(
          `
          id,
          description,
          amount,
          transaction_date,
          transaction_type,
          memo,
          bank_id,
          company_id,
          balance,
          fitid,
          ofx_import_date,
          created_at,
          updated_at
        `,
        )
        .in("id", paginatedIds)
        .order("transaction_date", { ascending: false });

      if (transactionsError) {
        console.error("Error fetching transactions:", transactionsError);
        return;
      }

      console.log("Raw transaction data:", transactionsData);

      // Fetch classifications for the paginated transactions
      const { data: classificationsData, error: classificationsError } = await supabase
        .from("transaction_classifications")
        .select(
          `
          transaction_id,
          commitment_group_id,
          commitment_id,
          commitment_type_id,
          commitment_groups (
            id,
            name,
            color
          ),
          commitments (
            id,
            name
          ),
          commitment_types (
            id,
            name
          )
        `,
        )
        .in("transaction_id", paginatedIds);

      if (classificationsError) {
        console.error("Error fetching classifications:", classificationsError);
      }

      console.log("Classifications data:", classificationsData);

      // Create a map of classifications by transaction_id
      const classificationsMap = new Map();
      classificationsData?.forEach((classification) => {
        classificationsMap.set(classification.transaction_id, {
          id: classification.transaction_id,
          group_name: classification.commitment_groups?.name || "",
          group_color: classification.commitment_groups?.color || "#6B7280",
          commitment_name: classification.commitments?.name || "",
          type_name: classification.commitment_types?.name || "",
        });
      });

      // Transform data to include classification info
      const transformedTransactions =
        transactionsData?.map((transaction) => ({
          ...transaction,
          transaction_type: transaction.transaction_type as "credit" | "debit",
          classification: classificationsMap.get(transaction.id) || null,
        })) || [];

      console.log("Final filtered transactions:", transformedTransactions);
      setTransactions(transformedTransactions);

      // Fetch classification rules
      const { data: rulesData, error: rulesError } = await supabase
        .from("classification_rules")
        .select("*")
        .eq("is_active", true);

      if (rulesError) {
        console.error("Error fetching rules:", rulesError);
      } else {
        setRules(rulesData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNFes = async () => {
    try {
      // Fetch NFe documents
      const { data: nfesData, error: nfesError } = await supabase
        .from("nfe_documents")
        .select(
          `
          id,
          nfe_number,
          serie,
          emission_date,
          operation_nature,
          cfop,
          total_nfe_value,
          company_id,
          created_at,
          nfe_emitters (cnpj, razao_social),
          nfe_recipients (cnpj, razao_social)
        `,
        )
        .order("emission_date", { ascending: false });

      if (nfesError) {
        console.error("Error fetching NFes:", nfesError);
        return;
      }

      // Fetch classifications for NFes from the new nfe_classifications table
      const nfeIds = nfesData?.map((n) => n.id) || [];

      const { data: classificationsData } = await supabase
        .from("nfe_classifications")
        .select(
          `
          nfe_document_id,
          commitment_group_id,
          commitment_id,
          commitment_type_id,
          commitment_groups (
            id,
            name,
            color
          ),
          commitments (
            id,
            name
          ),
          commitment_types (
            id,
            name
          )
        `,
        )
        .in("nfe_document_id", nfeIds);

      // Create a map of classifications
      const classificationsMap = new Map();
      classificationsData?.forEach((classification) => {
        classificationsMap.set(classification.nfe_document_id, {
          id: classification.nfe_document_id,
          group_name: classification.commitment_groups?.name || "",
          group_color: classification.commitment_groups?.color || "#6B7280",
          commitment_name: classification.commitments?.name || "",
          type_name: classification.commitment_types?.name || "",
        });
      });

      // Transform NFe data
      const transformedNFes =
        nfesData?.map((nfe) => ({
          ...nfe,
          classification: classificationsMap.get(nfe.id) || null,
        })) || [];

      setNfeDocuments(transformedNFes);
    } catch (error) {
      console.error("Error fetching NFes:", error);
    }
  };

  const fetchHierarchy = async () => {
    try {
      // Fetch commitment groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("commitment_groups")
        .select("*")
        .eq("is_active", true);

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Fetch commitments
      const { data: commitmentsData, error: commitmentsError } = await supabase
        .from("commitments")
        .select("*")
        .eq("is_active", true);

      if (commitmentsError) throw commitmentsError;
      setCommitments(commitmentsData || []);

      // Fetch commitment types
      const { data: typesData, error: typesError } = await supabase
        .from("commitment_types")
        .select("*")
        .eq("is_active", true);

      if (typesError) throw typesError;
      setTypes(typesData || []);
    } catch (error) {
      console.error("Error fetching hierarchy:", error);
    }
  };

  const handleClassifyTransaction = async (transactionId: string, groupId: string, commitmentId: string) => {
    try {
      // If all are empty, delete the classification
      if (!groupId && !commitmentId) {
        const { error } = await supabase
          .from("transaction_classifications")
          .delete()
          .eq("transaction_id", transactionId);

        if (error) throw error;
      } else {
        // Get the commitment type from the selected commitment
        let typeId = null;
        if (commitmentId) {
          const commitment = commitments.find((c) => c.id === commitmentId);
          typeId = commitment?.commitment_type_id || null;
        }

        // Get current user and company
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        const companyId = await getUserCompanyId();

        // Upsert the classification
        const { error } = await supabase.from("transaction_classifications").upsert({
          transaction_id: transactionId,
          company_id: companyId,
          classification: "manual",
          commitment_group_id: groupId || null,
          commitment_id: commitmentId || null,
          commitment_type_id: typeId,
          classified_by: user.id,
        });

        if (error) throw error;
      }

      // Refresh the data
      await fetchData();

      toast({
        title: "Classificação atualizada",
        description: "A movimentação foi classificada com sucesso",
      });
    } catch (error) {
      console.error("Error classifying transaction:", error);
      toast({
        title: "Erro na classificação",
        description: "Não foi possível classificar a movimentação",
        variant: "destructive",
      });
    }
  };

  const handleClassifyNFe = async (nfeId: string, groupId: string, commitmentId: string, typeId?: string) => {
    try {
      // If all are empty, delete the classification
      if (!groupId && !commitmentId && !typeId) {
        const { error } = await supabase.from("nfe_classifications").delete().eq("nfe_document_id", nfeId);

        if (error) throw error;
      } else {
        // Get the commitment type from the selected commitment if not provided
        let finalTypeId = typeId || null;
        if (!finalTypeId && commitmentId) {
          const commitment = commitments.find((c) => c.id === commitmentId);
          finalTypeId = commitment?.commitment_type_id || null;
        }

        // Get current user and company
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        const companyId = await getUserCompanyId();

        // Upsert the classification in nfe_classifications table
        const { error } = await supabase.from("nfe_classifications").upsert({
          nfe_document_id: nfeId,
          company_id: companyId,
          classification: "manual",
          commitment_group_id: groupId || null,
          commitment_id: commitmentId || null,
          commitment_type_id: finalTypeId,
          classified_by: user.id,
        });

        if (error) throw error;
      }

      // Refresh the data
      await fetchData();

      toast({
        title: "Classificação atualizada",
        description: "A NFe foi classificada com sucesso",
      });
    } catch (error) {
      console.error("Error classifying NFe:", error);
      toast({
        title: "Erro na classificação",
        description: "Não foi possível classificar a NFe",
        variant: "destructive",
      });
    }
  };

  const handleBulkClassify = async () => {
    if (!bulkGroup && !bulkCommitment) {
      toast({
        title: "Seleção inválida",
        description: "Selecione o grupo e o empenho",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Starting bulk classification:", {
        selectedTransactions,
        bulkGroup,
        bulkCommitment,
      });

      // Get current user and company
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const companyId = await getUserCompanyId();

      // Get the commitment type from the selected commitment
      let bulkType = null;
      if (bulkCommitment) {
        const commitment = commitments.find((c) => c.id === bulkCommitment);
        bulkType = commitment?.commitment_type_id || null;
      }

      // Process each selected transaction
      for (const transactionId of selectedTransactions) {
        // First, delete any existing classification
        const { error: deleteError } = await supabase
          .from("transaction_classifications")
          .delete()
          .eq("transaction_id", transactionId);

        if (deleteError) {
          console.error("Error deleting existing classification:", deleteError);
        }

        // Then insert the new classification
        const { error: insertError } = await supabase.from("transaction_classifications").insert({
          transaction_id: transactionId,
          company_id: companyId,
          classification: "manual",
          commitment_group_id: bulkGroup || null,
          commitment_id: bulkCommitment || null,
          commitment_type_id: bulkType,
          classified_by: user.id,
        });

        if (insertError) {
          console.error("Error inserting classification:", insertError);
          throw insertError;
        }
      }

      console.log("Bulk classification completed successfully");

      // Clear selections and refresh data
      setSelectedTransactions([]);
      setBulkGroup("");
      setBulkCommitment("");

      // Force refresh with a small delay to ensure data is updated
      setTimeout(() => {
        fetchData();
      }, 500);

      toast({
        title: "Classificação em lote concluída",
        description: `${selectedTransactions.length} movimentações foram classificadas`,
      });
    } catch (error) {
      console.error("Error bulk classifying:", error);
      toast({
        title: "Erro na classificação em lote",
        description: "Não foi possível classificar as movimentações",
        variant: "destructive",
      });
    }
  };

  const handleBulkRemove = async () => {
    try {
      console.log("Starting bulk classification removal:", {
        selectedTransactions,
      });

      // Process each selected transaction
      for (const transactionId of selectedTransactions) {
        const { error: deleteError } = await supabase
          .from("transaction_classifications")
          .delete()
          .eq("transaction_id", transactionId);

        if (deleteError) {
          console.error("Error deleting classification:", deleteError);
          throw deleteError;
        }
      }

      console.log("Bulk removal completed successfully");

      // Clear selections and refresh data
      const count = selectedTransactions.length;
      setSelectedTransactions([]);
      setBulkGroup("");
      setBulkCommitment("");

      // Force refresh with a small delay to ensure data is updated
      setTimeout(() => {
        fetchData();
      }, 500);

      toast({
        title: "Classificação removida",
        description: `${count} movimentações foram desclassificadas`,
      });
    } catch (error) {
      console.error("Error bulk removing classifications:", error);
      toast({
        title: "Erro ao remover classificações",
        description: "Não foi possível remover as classificações",
        variant: "destructive",
      });
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.rule_name || !newRule.description_contains) {
      toast({
        title: "Dados incompletos",
        description: "Preencha o nome da regra e a descrição",
        variant: "destructive",
      });
      return;
    }

    try {
      const companyId = await getUserCompanyId();

      const { error } = await supabase.from("classification_rules").insert({
        ...newRule,
        company_id: companyId,
        commitment_group_id: newRule.commitment_group_id || null,
        commitment_id: newRule.commitment_id || null,
        commitment_type_id: newRule.commitment_type_id || null,
      });

      if (error) throw error;

      await fetchData();
      setIsRuleDialogOpen(false);
      setNewRule({
        rule_name: "",
        description_contains: "",
        commitment_group_id: "",
        commitment_id: "",
        commitment_type_id: "",
      });

      toast({
        title: "Regra criada",
        description: "A regra de classificação foi criada com sucesso",
      });
    } catch (error) {
      console.error("Error creating rule:", error);
      toast({
        title: "Erro ao criar regra",
        description: "Não foi possível criar a regra",
        variant: "destructive",
      });
    }
  };

  const handleEditRule = (rule: ClassificationRule) => {
    setEditingRule(rule);
    setNewRule({
      rule_name: rule.rule_name,
      description_contains: rule.description_contains,
      commitment_group_id: rule.commitment_group_id || "",
      commitment_id: rule.commitment_id || "",
      commitment_type_id: rule.commitment_type_id || "",
    });
    setIsEditRuleDialogOpen(true);
  };

  const handleUpdateRule = async () => {
    if (!editingRule || !newRule.rule_name || !newRule.description_contains) {
      toast({
        title: "Dados incompletos",
        description: "Preencha o nome da regra e a descrição",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("classification_rules")
        .update({
          rule_name: newRule.rule_name,
          description_contains: newRule.description_contains,
          commitment_group_id: newRule.commitment_group_id || null,
          commitment_id: newRule.commitment_id || null,
          commitment_type_id: newRule.commitment_type_id || null,
        })
        .eq("id", editingRule.id);

      if (error) throw error;

      await fetchData();
      setIsEditRuleDialogOpen(false);
      setEditingRule(null);
      setNewRule({
        rule_name: "",
        description_contains: "",
        commitment_group_id: "",
        commitment_id: "",
        commitment_type_id: "",
      });

      toast({
        title: "Regra atualizada",
        description: "A regra foi atualizada com sucesso",
      });
    } catch (error) {
      console.error("Error updating rule:", error);
      toast({
        title: "Erro ao atualizar regra",
        description: "Não foi possível atualizar a regra",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra?")) {
      return;
    }

    try {
      const { error } = await supabase.from("classification_rules").delete().eq("id", ruleId);

      if (error) throw error;

      await fetchData();

      toast({
        title: "Regra excluída",
        description: "A regra foi excluída com sucesso",
      });
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast({
        title: "Erro ao excluir regra",
        description: "Não foi possível excluir a regra",
        variant: "destructive",
      });
    }
  };

  const applyAutomaticClassification = async () => {
    try {
      let appliedRules = 0;

      console.log("Starting automatic classification...");

      // Get current user and company first
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const companyId = await getUserCompanyId();

      // Fetch active rules directly from database
      const { data: activeRules, error: rulesError } = await supabase
        .from("classification_rules")
        .select("*")
        .eq("is_active", true)
        .eq("company_id", companyId);

      if (rulesError) {
        console.error("Error fetching rules:", rulesError);
        throw rulesError;
      }

      if (!activeRules || activeRules.length === 0) {
        toast({
          title: "Nenhuma regra encontrada",
          description: "Crie regras de classificação antes de aplicar",
        });
        return;
      }

      console.log("Active rules:", activeRules);

      // Build query with the same filters as the main view
      let allTransactionsQuery = supabase.from("transactions").select("id, description").eq("company_id", companyId);

      // Apply the same filters as fetchTransactions
      if (searchTerm) {
        allTransactionsQuery = allTransactionsQuery.ilike("description", `%${searchTerm}%`);
      }

      if (dateFrom) {
        allTransactionsQuery = allTransactionsQuery.gte("transaction_date", format(dateFrom, "yyyy-MM-dd"));
      }

      if (dateTo) {
        allTransactionsQuery = allTransactionsQuery.lte("transaction_date", format(dateTo, "yyyy-MM-dd"));
      }

      const { data: allTransactions, error: transactionsError } = await allTransactionsQuery;

      if (transactionsError) {
        console.error("Error fetching transactions for automatic classification:", transactionsError);
        throw transactionsError;
      }

      console.log("Total transactions found:", allTransactions?.length);

      if (!allTransactions || allTransactions.length === 0) {
        toast({
          title: "Nenhuma transação encontrada",
          description: "Não há transações para classificar com os filtros aplicados",
        });
        return;
      }

      // Get existing classifications to filter out already classified transactions
      const transactionIds = allTransactions.map((t) => t.id);

      // Process in batches to avoid URL length issues
      const batchSize = 100;
      const existingClassifications = [];

      for (let i = 0; i < transactionIds.length; i += batchSize) {
        const batch = transactionIds.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from("transaction_classifications")
          .select("transaction_id")
          .eq("company_id", companyId)
          .in("transaction_id", batch);

        if (error) {
          console.error("Error fetching existing classifications:", error);
          throw error;
        }

        if (data) {
          existingClassifications.push(...data);
        }
      }

      const classifiedIds = new Set(existingClassifications?.map((c) => c.transaction_id) || []);
      const unclassifiedTransactions = allTransactions.filter((t) => !classifiedIds.has(t.id));

      console.log("Unclassified transactions:", unclassifiedTransactions.length);

      if (unclassifiedTransactions.length === 0) {
        toast({
          title: "Todas as transações já estão classificadas",
          description: "Não há transações não classificadas para processar nos filtros aplicados",
        });
        return;
      }

      // Prepare bulk inserts
      const classificationsToInsert = [];

      for (const transaction of unclassifiedTransactions) {
        for (const rule of activeRules) {
          if (
            transaction.description &&
            transaction.description.toLowerCase().includes(rule.description_contains.toLowerCase())
          ) {
            console.log(`Matched rule "${rule.rule_name}" for transaction "${transaction.description}"`);

            // Get the commitment type from the selected commitment
            let typeId = rule.commitment_type_id || null;
            if (!typeId && rule.commitment_id) {
              const commitment = commitments.find((c) => c.id === rule.commitment_id);
              typeId = commitment?.commitment_type_id || null;
              console.log("Found commitment type from commitment:", typeId);
            }

            classificationsToInsert.push({
              transaction_id: transaction.id,
              company_id: companyId,
              classification: "automatic",
              commitment_group_id: rule.commitment_group_id || null,
              commitment_id: rule.commitment_id || null,
              commitment_type_id: typeId,
              classified_by: user.id,
            });

            appliedRules++;
            break; // Stop after first matching rule
          }
        }
      }

      console.log("Classifications to insert:", classificationsToInsert.length);

      // Insert all classifications at once if there are any
      if (classificationsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("transaction_classifications")
          .upsert(classificationsToInsert);

        if (insertError) {
          console.error("Error inserting classifications:", insertError);
          throw insertError;
        }
        console.log("Classifications inserted successfully");
      }

      // Refresh data after applying all rules
      await fetchData();

      // Show appropriate message
      if (appliedRules === 0) {
        toast({
          title: "Nenhuma regra aplicada",
          description: `Nenhuma das ${unclassifiedTransactions.length} transações não classificadas correspondeu às regras existentes`,
        });
      } else {
        toast({
          title: "Classificação automática aplicada",
          description: `${appliedRules} movimentações foram classificadas automaticamente`,
        });
      }
    } catch (error) {
      console.error("Error applying automatic classification:", error);
      toast({
        title: "Erro na classificação automática",
        description: "Não foi possível aplicar as regras",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = ["Data", "Descrição", "Valor", "Tipo", "Grupo", "Empenho", "Tipo de Empenho"];
    const csvData = transactions.map((transaction) => [
      format(new Date(transaction.transaction_date), "dd/MM/yyyy"),
      transaction.description,
      transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      transaction.transaction_type === "credit" ? "Crédito" : "Débito",
      transaction.classification?.group_name || "Não classificado",
      transaction.classification?.commitment_name || "",
      transaction.classification?.type_name || "",
    ]);

    const csvString = [headers, ...csvData].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n");

    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `classificacao_movimentos_${format(new Date(), "dd-MM-yyyy")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Summary statistics state
  const [summaryStats, setSummaryStats] = useState({
    totalClassified: 0,
    totalUnclassified: 0,
    totalTransactionsCount: 0,
  });

  // NFe summary statistics state
  const [nfeSummaryStats, setNfeSummaryStats] = useState({
    totalEntradas: 0,
    totalSaidas: 0,
    totalEntradasValue: 0,
    totalSaidasValue: 0,
    classificationPercentage: 0,
    totalNFesCount: 0,
  });

  // Fetch summary statistics (independent of status and group filters)
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const companyId = await getUserCompanyId();

        // Build base query for counting all transactions (only search and date filters)
        let totalCountQuery = supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId);

        // Apply only search and date filters
        if (searchTerm) {
          totalCountQuery = totalCountQuery.ilike("description", `%${searchTerm}%`);
        }
        if (dateFrom) {
          const dateStr = format(dateFrom, "yyyy-MM-dd");
          totalCountQuery = totalCountQuery.gte("transaction_date", dateStr);
        }
        if (dateTo) {
          const dateStr = format(dateTo, "yyyy-MM-dd");
          totalCountQuery = totalCountQuery.lte("transaction_date", dateStr);
        }

        // Execute count query
        const { count: totalTransactionsCount, error: totalError } = await totalCountQuery;

        if (totalError) {
          console.error("Error fetching summary counts:", { totalError });
          return;
        }

        // Count ALL classified transactions for this company
        const { data: allClassifiedTransactions, error: classError } = await supabase
          .from("transaction_classifications")
          .select("transaction_id")
          .eq("company_id", companyId);

        if (classError) {
          console.error("Error fetching classifications:", { classError });
          return;
        }

        const classifiedTransactionIds = new Set(allClassifiedTransactions?.map((c) => c.transaction_id) || []);

        // Now filter by search and date to get which classified transactions are in the current view
        let filteredTransactionsQuery = supabase.from("transactions").select("id").eq("company_id", companyId);

        if (searchTerm) {
          filteredTransactionsQuery = filteredTransactionsQuery.ilike("description", `%${searchTerm}%`);
        }
        if (dateFrom) {
          filteredTransactionsQuery = filteredTransactionsQuery.gte("transaction_date", format(dateFrom, "yyyy-MM-dd"));
        }
        if (dateTo) {
          filteredTransactionsQuery = filteredTransactionsQuery.lte("transaction_date", format(dateTo, "yyyy-MM-dd"));
        }

        const { data: filteredTransactions } = await filteredTransactionsQuery;
        const filteredTransactionIds = filteredTransactions?.map((t) => t.id) || [];

        // Count how many of the filtered transactions are classified
        const totalClassified = filteredTransactionIds.filter((id) => classifiedTransactionIds.has(id)).length;
        const totalUnclassified = (totalTransactionsCount || 0) - totalClassified;

        console.log("Summary Stats Debug:", {
          totalTransactionsCount,
          totalClassified,
          totalUnclassified,
          allClassifiedCount: classifiedTransactionIds.size,
          filteredTransactionsCount: filteredTransactionIds.length,
        });

        setSummaryStats({
          totalClassified,
          totalUnclassified,
          totalTransactionsCount: totalTransactionsCount || 0,
        });
      } catch (error) {
        console.error("Error calculating summary:", error);
      }
    };

    fetchSummary();
  }, [searchTerm, dateFrom, dateTo]);

  // Fetch NFe summary statistics
  useEffect(() => {
    const fetchNFeSummary = async () => {
      try {
        // Get company ID first
        const { data: companies } = await supabase.from("companies").select("id").limit(1);

        if (!companies || companies.length === 0) return;

        const companyId = companies[0].id;

        // Fetch all NFes
        const { data: allNFes, error } = await supabase
          .from("nfe_documents")
          .select("id, cfop, total_nfe_value")
          .eq("company_id", companyId);

        if (error) {
          console.error("Error fetching NFe summary data:", error);
          return;
        }

        // Get classifications count for NFes
        const nfeIds = allNFes?.map((n) => n.id) || [];
        let classificationQuery = supabase
          .from("transaction_classifications")
          .select("transaction_id", { count: "exact", head: true });

        if (nfeIds.length > 0) {
          classificationQuery = classificationQuery.in("transaction_id", nfeIds);
        }

        const { count: classifiedCount } = await classificationQuery;

        // Calculate totals - CFOPs starting with 1 or 2 are entradas (compras), 5 or 6 are saídas (vendas)
        const totalNFesCount = allNFes?.length || 0;
        const classificationPercentage = totalNFesCount > 0 ? ((classifiedCount || 0) / totalNFesCount) * 100 : 0;

        const entradas =
          allNFes?.filter((n) => {
            const cfopFirst = n.cfop?.charAt(0);
            return cfopFirst === "1" || cfopFirst === "2";
          }) || [];

        const saidas =
          allNFes?.filter((n) => {
            const cfopFirst = n.cfop?.charAt(0);
            return cfopFirst === "5" || cfopFirst === "6";
          }) || [];

        const totalEntradas = entradas.length;
        const totalSaidas = saidas.length;
        const totalEntradasValue = entradas.reduce((sum, n) => sum + (n.total_nfe_value || 0), 0);
        const totalSaidasValue = saidas.reduce((sum, n) => sum + (n.total_nfe_value || 0), 0);

        setNfeSummaryStats({
          totalEntradas,
          totalSaidas,
          totalEntradasValue,
          totalSaidasValue,
          classificationPercentage,
          totalNFesCount,
        });
      } catch (error) {
        console.error("Error calculating NFe summary:", error);
      }
    };

    fetchNFeSummary();
  }, [nfeDocuments]);

  // Filter transactions - now just for display since server-side filtering is done
  const filteredTransactions = transactions;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Hierarchy Management */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <CommitmentHierarchy
              onSelectionChange={() => {}}
              showManagement={true}
              onHierarchyChange={fetchHierarchy}
            />
          </div>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transactions">Transações OFX</TabsTrigger>
            <TabsTrigger value="nfes">Notas Fiscais</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarquia</TabsTrigger>
            <TabsTrigger value="rules">Regras</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6">
            {/* Transaction-specific actions */}
            <div className="flex justify-end gap-2">
              <Button onClick={applyAutomaticClassification} variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Aplicar Regras
              </Button>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Classificado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{summaryStats.totalClassified || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total não classificado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">{summaryStats.totalUnclassified || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Movimentações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryStats.totalTransactionsCount || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Buscar por descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os grupos</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                            {group.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="classified">Classificados</SelectItem>
                      <SelectItem value="unclassified">Não classificados</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Classification Panel */}
            {selectedTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Classificação em Lote ({selectedTransactions.length} selecionadas)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-4">
                      {/* <div>
                        <Label className="text-sm font-medium mb-2 block">Grupo de Empenho</Label>
                        <Select value={bulkGroup} onValueChange={setBulkGroup}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o grupo de empenho" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map(group => (
                              <SelectItem key={group.id} value={group.id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full border-2"
                                    style={{ borderColor: group.color, backgroundColor: `${group.color}20` }}
                                  />
                                  {group.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div> */}

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Empenho</Label>
                        <Select value={bulkCommitment} onValueChange={setBulkCommitment} disabled={!bulkGroup}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o empenho" />
                          </SelectTrigger>
                          <SelectContent>
                            {commitments
                              .filter((commitment) => commitment.commitment_group_id === bulkGroup)
                              .map((commitment) => (
                                <SelectItem key={commitment.id} value={commitment.id}>
                                  {commitment.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleBulkClassify} className="flex-1">
                        <Save className="w-4 h-4 mr-2" />
                        Classificar Selecionadas
                      </Button>
                      <Button variant="destructive" onClick={handleBulkRemove}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedTransactions([])}>
                        Limpar Seleção
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transactions List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Movimentações</CardTitle>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Itens por página:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Carregando movimentações...</p>
                    </div>
                  ) : (
                    <>
                      {filteredTransactions.map((transaction) => (
                        <div key={transaction.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedTransactions.includes(transaction.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTransactions((prev) => [...prev, transaction.id]);
                                  } else {
                                    setSelectedTransactions((prev) => prev.filter((id) => id !== transaction.id));
                                  }
                                }}
                                className="rounded"
                              />
                              <div>
                                <div className="font-medium">{transaction.description}</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(transaction.transaction_date), "dd/MM/yyyy", { locale: ptBR })}
                                  {transaction.memo && ` • ${transaction.memo}`}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`font-semibold ${transaction.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                R$ {Math.abs(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {transaction.transaction_type === "credit" ? "Crédito" : "Débito"}
                              </div>
                            </div>
                          </div>

                          {/* Classification Section */}
                          <div className="border-t pt-3">
                            {transaction.classification ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Check className="w-4 h-4 text-green-500" />
                                  <div className="flex items-center gap-1">
                                    {transaction.classification.group_name && (
                                      <Badge
                                        variant="secondary"
                                        style={{
                                          backgroundColor: `${transaction.classification.group_color}20`,
                                          borderColor: transaction.classification.group_color,
                                        }}
                                      >
                                        {transaction.classification.group_name}
                                      </Badge>
                                    )}
                                    {transaction.classification.commitment_name && (
                                      <Badge variant="outline">{transaction.classification.commitment_name}</Badge>
                                    )}
                                    {transaction.classification.type_name && (
                                      <Badge variant="outline">{transaction.classification.type_name}</Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Reset classification
                                    handleClassifyTransaction(transaction.id, "", "");
                                  }}
                                >
                                  Remover
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm text-muted-foreground">
                                  Não classificado - Use a classificação em lote para classificar
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Pagination */}
                      {totalItems > itemsPerPage && (
                        <div className="flex items-center justify-between pt-4">
                          <div className="text-sm text-muted-foreground">
                            Exibindo {(currentPage - 1) * itemsPerPage + 1} -{" "}
                            {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} movimentações
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                            >
                              Anterior
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, Math.ceil(totalItems / itemsPerPage)) }, (_, i) => {
                                const totalPages = Math.ceil(totalItems / itemsPerPage);
                                const page =
                                  currentPage <= 3
                                    ? i + 1
                                    : currentPage >= totalPages - 2
                                      ? totalPages - 4 + i
                                      : currentPage - 2 + i;

                                if (page < 1 || page > totalPages) return null;

                                return (
                                  <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                  >
                                    {page}
                                  </Button>
                                );
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentPage(Math.min(Math.ceil(totalItems / itemsPerPage), currentPage + 1))
                              }
                              disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
                            >
                              Próxima
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nfes" className="space-y-6">
            {/* NFe Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Entradas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{nfeSummaryStats.totalEntradas || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    R$ {nfeSummaryStats.totalEntradasValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Saídas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{nfeSummaryStats.totalSaidas || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    R$ {nfeSummaryStats.totalSaidasValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{nfeSummaryStats.totalNFesCount || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Classificação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{nfeSummaryStats.classificationPercentage.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${nfeSummaryStats.totalSaidasValue - nfeSummaryStats.totalEntradasValue >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    R${" "}
                    {(nfeSummaryStats.totalSaidasValue - nfeSummaryStats.totalEntradasValue).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* NFe List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notas Fiscais</CardTitle>
                <CardDescription>Classifique as NFes importadas por tipo, grupo e empenho</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Carregando NFes...</p>
                    </div>
                  ) : nfeDocuments.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhuma NFe encontrada. Importe NFes na página de Upload NFe.
                      </p>
                    </div>
                  ) : (
                    <>
                      {nfeDocuments.map((nfe) => (
                        <div key={nfe.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                NFe {nfe.nfe_number} - Série {nfe.serie}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(nfe.emission_date), "dd/MM/yyyy", { locale: ptBR })}
                                {" • "}
                                {nfe.nfe_emitters[0]?.razao_social}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {nfe.operation_nature} {nfe.cfop && `(CFOP: ${nfe.cfop})`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-lg">
                                R$ {nfe.total_nfe_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>

                          {/* Classification Section */}
                          <div className="border-t pt-3">
                            {nfe.classification ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Check className="w-4 h-4 text-green-500" />
                                  <div className="flex items-center gap-1">
                                    {nfe.classification.group_name && (
                                      <Badge
                                        variant="secondary"
                                        style={{
                                          backgroundColor: `${nfe.classification.group_color}20`,
                                          borderColor: nfe.classification.group_color,
                                        }}
                                      >
                                        {nfe.classification.group_name}
                                      </Badge>
                                    )}
                                    {nfe.classification.commitment_name && (
                                      <Badge variant="outline">{nfe.classification.commitment_name}</Badge>
                                    )}
                                    {nfe.classification.type_name && (
                                      <Badge variant="outline">{nfe.classification.type_name}</Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Reset classification
                                    handleClassifyNFe(nfe.id, "", "");
                                  }}
                                >
                                  Remover
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-yellow-500" />
                                  <span className="text-sm text-muted-foreground">Não classificado</span>
                                </div>

                                {/* Classification Controls */}
                                <div className="flex flex-col md:flex-row gap-2">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                                    {/* Tipo de Empenho */}
                                    <Select
                                      value={pendingNFeClassifications[nfe.id]?.typeId || ""}
                                      onValueChange={(typeId) => {
                                        setPendingNFeClassifications((prev) => ({
                                          ...prev,
                                          [nfe.id]: {
                                            ...prev[nfe.id],
                                            typeId: typeId,
                                          },
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Tipo de empenho" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {types.map((type) => (
                                          <SelectItem key={type.id} value={type.id}>
                                            {type.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    {/* Grupo de Empenho */}
                                    <Select
                                      value={pendingNFeClassifications[nfe.id]?.groupId || ""}
                                      onValueChange={(groupId) => {
                                        setPendingNFeClassifications((prev) => ({
                                          ...prev,
                                          [nfe.id]: {
                                            ...prev[nfe.id],
                                            groupId: groupId,
                                          },
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Grupo de empenho" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {groups.map((group) => (
                                          <SelectItem key={group.id} value={group.id}>
                                            <div className="flex items-center gap-2">
                                              <div
                                                className="w-3 h-3 rounded-full border-2"
                                                style={{
                                                  borderColor: group.color,
                                                  backgroundColor: `${group.color}20`,
                                                }}
                                              />
                                              {group.name}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    {/* Empenho */}
                                    <Select
                                      value={pendingNFeClassifications[nfe.id]?.commitmentId || ""}
                                      onValueChange={(commitmentId) => {
                                        setPendingNFeClassifications((prev) => ({
                                          ...prev,
                                          [nfe.id]: {
                                            ...prev[nfe.id],
                                            commitmentId: commitmentId,
                                          },
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Empenho" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {commitments
                                          .filter(
                                            (c) =>
                                              !pendingNFeClassifications[nfe.id]?.groupId ||
                                              c.commitment_group_id === pendingNFeClassifications[nfe.id]?.groupId,
                                          )
                                          .map((commitment) => (
                                            <SelectItem key={commitment.id} value={commitment.id}>
                                              {commitment.name}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Botão Salvar - só aparece se houver alguma seleção */}
                                  {pendingNFeClassifications[nfe.id] &&
                                    (pendingNFeClassifications[nfe.id].groupId ||
                                      pendingNFeClassifications[nfe.id].commitmentId ||
                                      pendingNFeClassifications[nfe.id].typeId) && (
                                      <Button
                                        onClick={async () => {
                                          const pending = pendingNFeClassifications[nfe.id];
                                          await handleClassifyNFe(
                                            nfe.id,
                                            pending.groupId || "",
                                            pending.commitmentId || "",
                                            pending.typeId,
                                          );
                                          // Limpar as seleções pendentes após salvar
                                          setPendingNFeClassifications((prev) => {
                                            const newState = { ...prev };
                                            delete newState[nfe.id];
                                            return newState;
                                          });
                                        }}
                                        className="whitespace-nowrap"
                                      >
                                        <Save className="w-4 h-4 mr-2" />
                                        Salvar
                                      </Button>
                                    )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hierarchy" className="space-y-6">
            {/* Filtro por Tipo de Empenho */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Filtrar por Tipo de Empenho</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os tipos de empenho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos de empenho</SelectItem>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Visualização da Hierarquia */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TreePine className="w-5 h-5" />
                  Hierarquia de Empenhos
                </CardTitle>
                <CardDescription>Estrutura: Tipo de Empenho › Grupo de Empenho › Empenho</CardDescription>
              </CardHeader>
              <CardContent>
                {types.length === 0 ? (
                  <div className="text-center py-8">
                    <TreePine className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma hierarquia criada</h3>
                    <p className="text-muted-foreground mb-4">
                      Crie tipos, grupos e empenhos para organizar suas classificações
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredHierarchy().map((type) => (
                      <div key={type.id} className="border rounded-lg bg-card">
                        {/* Tipo de Empenho */}
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleType(type.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-primary-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-foreground">{type.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {type.groups.length} grupos •{" "}
                                {type.groups.reduce((acc, g) => acc + g.commitments.length, 0)} empenhos
                              </p>
                            </div>
                          </div>
                          <div
                            className={`transition-transform duration-200 ${expandedTypes.has(type.id) ? "rotate-180" : ""}`}
                          >
                            ▼
                          </div>
                        </div>

                        {/* Grupos dentro do Tipo */}
                        <div
                          className={`overflow-hidden transition-all duration-300 ${
                            expandedTypes.has(type.id) ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                          }`}
                        >
                          <div className="px-4 pb-4 space-y-3">
                            {type.groups.map((group) => (
                              <div key={group.id} className="ml-6 border border-border/50 rounded-md bg-muted/20">
                                {/* Grupo de Empenho */}
                                <div
                                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => toggleGroup(group.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-4 h-4 rounded-full border-2"
                                      style={{ borderColor: group.color, backgroundColor: `${group.color}20` }}
                                    />
                                    <div>
                                      <h4 className="font-medium text-foreground">{group.name}</h4>
                                      {group.description && (
                                        <p className="text-xs text-muted-foreground">{group.description}</p>
                                      )}
                                      <p className="text-xs text-muted-foreground">
                                        {group.commitments.length} empenhos
                                      </p>
                                    </div>
                                  </div>
                                  <div
                                    className={`transition-transform duration-200 ${expandedGroups.has(group.id) ? "rotate-180" : ""}`}
                                  >
                                    ▼
                                  </div>
                                </div>

                                {/* Empenhos dentro do Grupo */}
                                <div
                                  className={`overflow-hidden transition-all duration-300 ${
                                    expandedGroups.has(group.id) ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                                  }`}
                                >
                                  <div className="px-3 pb-3 space-y-2">
                                    {group.commitments.length === 0 ? (
                                      <div className="ml-6 text-xs text-muted-foreground py-2">
                                        Nenhum empenho criado neste grupo
                                      </div>
                                    ) : (
                                      group.commitments.map((commitment) => (
                                        <div
                                          key={commitment.id}
                                          className="ml-6 flex items-center gap-2 py-2 px-3 rounded-md bg-background border border-border/30"
                                        >
                                          <div className="w-2 h-2 rounded-full bg-primary/60" />
                                          <span className="text-sm text-foreground font-medium">{commitment.name}</span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gerenciar Hierarquia 
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Gerenciar Hierarquia de Empenhos
                </CardTitle>
                <CardDescription>
                  Crie e edite tipos, grupos e empenhos da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CommitmentHierarchy
                  onSelectionChange={() => { }}
                  showManagement={true}
                  onHierarchyChange={fetchHierarchy}
                />
              </CardContent>
            </Card>*/}
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            {/* Rules actions */}
            <div className="flex justify-end">
              <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Regra
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nova Regra de Classificação Automática</DialogTitle>
                    <DialogDescription>
                      Crie uma regra para classificação automática baseada na descrição da movimentação
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rule-name">Nome da Regra</Label>
                      <Input
                        id="rule-name"
                        value={newRule.rule_name}
                        onChange={(e) => setNewRule((prev) => ({ ...prev, rule_name: e.target.value }))}
                        placeholder="Ex: Pagamentos com cartão VISA"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description-contains">Descrição contém</Label>
                      <Input
                        id="description-contains"
                        value={newRule.description_contains}
                        onChange={(e) => setNewRule((prev) => ({ ...prev, description_contains: e.target.value }))}
                        placeholder="Ex: VISA"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Classificação</Label>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Grupo de Empenho</Label>
                          <Select
                            value={newRule.commitment_group_id}
                            onValueChange={(value) =>
                              setNewRule((prev) => ({
                                ...prev,
                                commitment_group_id: value,
                                commitment_id: "",
                                commitment_type_id: "",
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o grupo de empenho" />
                            </SelectTrigger>
                            <SelectContent>
                              {groups.map((group) => (
                                <SelectItem key={group.id} value={group.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full border-2"
                                      style={{ borderColor: group.color, backgroundColor: `${group.color}20` }}
                                    />
                                    {group.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">Empenho</Label>
                          <Select
                            value={newRule.commitment_id}
                            onValueChange={(value) => {
                              const commitment = commitments.find((c) => c.id === value);
                              setNewRule((prev) => ({
                                ...prev,
                                commitment_id: value,
                                commitment_type_id: commitment?.commitment_type_id || "",
                              }));
                            }}
                            disabled={!newRule.commitment_group_id}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o empenho" />
                            </SelectTrigger>
                            <SelectContent>
                              {commitments
                                .filter((commitment) => commitment.commitment_group_id === newRule.commitment_group_id)
                                .map((commitment) => (
                                  <SelectItem key={commitment.id} value={commitment.id}>
                                    {commitment.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleCreateRule} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Regra
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Regras de Classificação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Regras de Classificação Automática
                </CardTitle>
                <CardDescription>Gerencie as regras para classificação automática de movimentações</CardDescription>
              </CardHeader>
              <CardContent>
                {rules.length === 0 ? (
                  <div className="text-center py-8">
                    <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma regra criada</h3>
                    <p className="text-muted-foreground mb-4">
                      Crie regras para automatizar a classificação das movimentações
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-background hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-foreground">{rule.rule_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              Contém: "{rule.description_contains}"
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Classifica para:</span>
                            <div className="flex items-center gap-1">
                              {rule.commitment_group_id && (
                                <Badge variant="secondary" className="text-xs">
                                  Grupo
                                </Badge>
                              )}
                              {rule.commitment_id && (
                                <Badge variant="secondary" className="text-xs">
                                  Empenho
                                </Badge>
                              )}
                              {rule.commitment_type_id && (
                                <Badge variant="secondary" className="text-xs">
                                  Tipo
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditRule(rule)}>
                            Editar
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                            Excluir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Rule Dialog */}
        <Dialog open={isEditRuleDialogOpen} onOpenChange={setIsEditRuleDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Regra de Classificação</DialogTitle>
              <DialogDescription>Modifique a regra de classificação automática</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-rule-name">Nome da Regra</Label>
                <Input
                  id="edit-rule-name"
                  value={newRule.rule_name}
                  onChange={(e) => setNewRule((prev) => ({ ...prev, rule_name: e.target.value }))}
                  placeholder="Ex: Pagamentos com cartão VISA"
                />
              </div>
              <div>
                <Label htmlFor="edit-description-contains">Descrição contém</Label>
                <Input
                  id="edit-description-contains"
                  value={newRule.description_contains}
                  onChange={(e) => setNewRule((prev) => ({ ...prev, description_contains: e.target.value }))}
                  placeholder="Ex: VISA"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Classificação</Label>
                <CommitmentHierarchy
                  selectedGroup={newRule.commitment_group_id}
                  selectedCommitment={newRule.commitment_id}
                  selectedType={newRule.commitment_type_id}
                  onSelectionChange={(group, commitment, type) => {
                    setNewRule((prev) => ({
                      ...prev,
                      commitment_group_id: group,
                      commitment_id: commitment,
                      commitment_type_id: type,
                    }));
                  }}
                  onHierarchyChange={fetchHierarchy}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleUpdateRule} className="flex-1">
                  Atualizar Regra
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditRuleDialogOpen(false);
                    setEditingRule(null);
                    setNewRule({
                      rule_name: "",
                      description_contains: "",
                      commitment_group_id: "",
                      commitment_id: "",
                      commitment_type_id: "",
                    });
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TransactionClassification;
