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
  X,
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
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [groups, setGroups] = useState<CommitmentGroup[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [types, setTypes] = useState<CommitmentType[]>([]);

  // Filtered options for cascading dropdowns
  const [filteredGroups, setFilteredGroups] = useState<CommitmentGroup[]>([]);
  const [filteredCommitments, setFilteredCommitments] = useState<Commitment[]>([]);
  
  // Filtered options for BULK cascading dropdowns
  const [bulkFilteredGroups, setBulkFilteredGroups] = useState<CommitmentGroup[]>([]);
  const [bulkFilteredCommitments, setBulkFilteredCommitments] = useState<Commitment[]>([]);

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
  const [bulkType, setBulkType] = useState("");
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

  useEffect(() => {
    fetchData();
    fetchHierarchy();
    fetchRules();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, selectedGroup, selectedStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, searchTerm, selectedGroup, selectedStatus, dateFrom, dateTo]);

  // Filter groups based on selected type
  useEffect(() => {
    if (newRule.commitment_type_id) {
      // Find commitments that belong to the selected type
      const commitmentsOfType = commitments.filter(
        (c) => c.commitment_type_id === newRule.commitment_type_id
      );
      
      // Extract unique group IDs from those commitments
      const groupIds = new Set(commitmentsOfType.map((c) => c.commitment_group_id));
      
      // Filter groups to show only those that have commitments of this type
      const filtered = groups.filter((g) => groupIds.has(g.id));
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups([]);
    }
  }, [newRule.commitment_type_id, commitments, groups]);

  // Filter commitments based on selected type AND group
  useEffect(() => {
    if (newRule.commitment_type_id && newRule.commitment_group_id) {
      const filtered = commitments.filter(
        (c) =>
          c.commitment_type_id === newRule.commitment_type_id &&
          c.commitment_group_id === newRule.commitment_group_id
      );
      setFilteredCommitments(filtered);
    } else {
      setFilteredCommitments([]);
    }
  }, [newRule.commitment_type_id, newRule.commitment_group_id, commitments]);

  // Filter bulk groups based on selected bulk type
  useEffect(() => {
    if (bulkType) {
      // Find commitments that belong to the selected type
      const commitmentsOfType = commitments.filter(
        (c) => c.commitment_type_id === bulkType
      );
      
      // Extract unique group IDs from those commitments
      const groupIds = new Set(commitmentsOfType.map((c) => c.commitment_group_id));
      
      // Filter groups to show only those that have commitments of this type
      const filtered = groups.filter((g) => groupIds.has(g.id));
      setBulkFilteredGroups(filtered);
    } else {
      setBulkFilteredGroups([]);
    }
  }, [bulkType, commitments, groups]);

  // Filter bulk commitments based on selected bulk type AND bulk group
  useEffect(() => {
    if (bulkType && bulkGroup) {
      const filtered = commitments.filter(
        (c) =>
          c.commitment_type_id === bulkType &&
          c.commitment_group_id === bulkGroup
      );
      setBulkFilteredCommitments(filtered);
    } else {
      setBulkFilteredCommitments([]);
    }
  }, [bulkType, bulkGroup, commitments]);

  // Real-time updates for transactions and classifications
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

  // Real-time updates for classification rules
  useEffect(() => {
    const rulesChannel = supabase
      .channel("classification-rules-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classification_rules",
        },
        () => {
          fetchRules();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rulesChannel);
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
    try {
      setLoading(true);

      // Get user's company_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Empresa não encontrada para o usuário",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const companyId = profile.company_id;

      // Fetch all classifications for the company to use for filtering
      const { data: allClassifications } = await supabase
        .from("transaction_classifications")
        .select("transaction_id, commitment_group_id");

      const classifiedIdsSet = new Set(allClassifications?.map((c) => c.transaction_id) || []);

      // Build base query for transactions
      let baseQuery = supabase.from("transactions").select(`
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
        `);

      // Apply company filter - CRITICAL
      baseQuery = baseQuery.eq("company_id", companyId);

      // Apply text search filter
      if (searchTerm) {
        baseQuery = baseQuery.ilike("description", `%${searchTerm}%`);
      }

      // Apply date filters
      if (dateFrom) {
        baseQuery = baseQuery.gte("transaction_date", format(dateFrom, "yyyy-MM-dd"));
      }

      if (dateTo) {
        baseQuery = baseQuery.lte("transaction_date", format(dateTo, "yyyy-MM-dd"));
      }

      // Fetch ALL transactions matching the base filters (no pagination yet)
      const { data: allTransactionsData, error: allTransactionsError } = await baseQuery.order("transaction_date", {
        ascending: false,
      });

      if (allTransactionsError) {
        console.error("Error fetching transactions:", allTransactionsError);
        toast({
          title: "Erro ao buscar transações",
          description: allTransactionsError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Apply status and group filters in memory
      let filteredTransactions = allTransactionsData || [];

      // Apply status filter
      if (selectedStatus === "classified") {
        filteredTransactions = filteredTransactions.filter((t) => classifiedIdsSet.has(t.id));
      } else if (selectedStatus === "unclassified") {
        filteredTransactions = filteredTransactions.filter((t) => !classifiedIdsSet.has(t.id));
      }

      // Apply group filter
      if (selectedGroup !== "all") {
        const groupClassifiedIds = new Set(
          allClassifications?.filter((c) => c.commitment_group_id === selectedGroup).map((c) => c.transaction_id) || [],
        );
        filteredTransactions = filteredTransactions.filter((t) => groupClassifiedIds.has(t.id));
      }

      // Set total count after filtering
      setTotalItems(filteredTransactions.length);

      // Apply pagination to filtered results
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage;
      const paginatedTransactions = filteredTransactions.slice(from, to);

      // Fetch classifications for the paginated transactions
      const transactionIds = paginatedTransactions.map((t) => t.id);

      if (transactionIds.length === 0) {
        setTransactions([]);
        setLoading(false);
        return;
      }

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
        .in("transaction_id", transactionIds);

      if (classificationsError) {
        console.error("Error fetching classifications:", classificationsError);
      }

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
      const transformedTransactions = paginatedTransactions.map((transaction) => ({
        ...transaction,
        transaction_type: transaction.transaction_type as "credit" | "debit",
        classification: classificationsMap.get(transaction.id) || null,
      }));

      setTransactions(transformedTransactions);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
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

  const fetchRules = async () => {
    try {
      // Get user's company_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();

      if (!profile?.company_id) return;

      const companyId = profile.company_id;

      // Fetch classification rules for the company
      const { data: rulesData, error: rulesError } = await supabase
        .from("classification_rules")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (rulesError) {
        console.error("Error fetching rules:", rulesError);
      } else {
        setRules(rulesData || []);
      }
    } catch (error) {
      console.error("Error fetching rules:", error);
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

        // Upsert the classification
        const { error } = await supabase.from("transaction_classifications").upsert({
          transaction_id: transactionId,
          commitment_group_id: groupId || null,
          commitment_id: commitmentId || null,
          commitment_type_id: typeId,
          classified_by: (await supabase.auth.getUser()).data.user?.id,
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

  const handleBulkClassify = async () => {
    if (!bulkType || !bulkGroup || !bulkCommitment) {
      toast({
        title: "Seleção inválida",
        description: "Selecione o tipo, grupo e a natureza",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Starting bulk classification:", {
        selectedTransactions,
        bulkType,
        bulkGroup,
        bulkCommitment,
      });

      const userId = (await supabase.auth.getUser()).data.user?.id;

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
          commitment_group_id: bulkGroup || null,
          commitment_id: bulkCommitment || null,
          commitment_type_id: bulkType || null,
          classified_by: userId,
        });

        if (insertError) {
          console.error("Error inserting classification:", insertError);
          throw insertError;
        }
      }

      console.log("Bulk classification completed successfully");

      // Clear selections and refresh data
      setSelectedTransactions([]);
      setBulkType("");
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

  const handleBulkRemoveClassification = async () => {
    if (selectedTransactions.length === 0) {
      toast({
        title: "Nenhuma movimentação selecionada",
        description: "Selecione pelo menos uma movimentação",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete all classifications for selected transactions
      const { error } = await supabase
        .from("transaction_classifications")
        .delete()
        .in("transaction_id", selectedTransactions);

      if (error) throw error;

      // Clear selection
      setSelectedTransactions([]);

      // Refresh data
      await fetchData();

      toast({
        title: "Classificações removidas",
        description: `${selectedTransactions.length} classificações foram removidas com sucesso`,
      });
    } catch (error) {
      console.error("Error removing bulk classifications:", error);
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
      // Get user's company_id from profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Empresa não encontrada",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("classification_rules").insert({
        ...newRule,
        company_id: profile.company_id,
        commitment_group_id: newRule.commitment_group_id || null,
        commitment_id: newRule.commitment_id || null,
        commitment_type_id: newRule.commitment_type_id || null,
      });

      if (error) throw error;

      await fetchRules();
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

      await fetchRules();
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

      await fetchRules();

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
      let processedTransactions = 0;
      const batchSize = 100;

      // Get company_id first
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();

      if (!profile?.company_id) throw new Error("Company not found");

      // Get all transactions from the user's company
      const { data: allTransactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("id, description")
        .eq("company_id", profile.company_id);

      if (transactionsError) {
        throw transactionsError;
      }

      if (!allTransactions || allTransactions.length === 0) {
        toast({
          title: "Nenhuma transação encontrada",
          description: "Não há transações para classificar",
        });
        return;
      }

      // Get ALL existing classifications for this company (without .in() limit issues)
      const { data: existingClassifications, error: classificationsError } = await supabase
        .from("transaction_classifications")
        .select("transaction_id");

      if (classificationsError) {
        throw classificationsError;
      }

      const classifiedIds = new Set(existingClassifications?.map((c) => c.transaction_id) || []);
      const unclassifiedTransactions = allTransactions.filter((t) => !classifiedIds.has(t.id));

      if (unclassifiedTransactions.length === 0) {
        toast({
          title: "Todas as transações já estão classificadas",
          description: "Não há transações não classificadas para processar",
        });
        return;
      }

      // Process transactions in batches
      for (let i = 0; i < unclassifiedTransactions.length; i += batchSize) {
        const batch = unclassifiedTransactions.slice(i, i + batchSize);

        for (const transaction of batch) {
          for (const rule of rules) {
            if (transaction.description.toLowerCase().includes(rule.description_contains.toLowerCase())) {
              await handleClassifyTransaction(transaction.id, rule.commitment_group_id || "", rule.commitment_id || "");
              appliedRules++;
              break;
            }
          }
          processedTransactions++;
        }

        // Show progress for large batches
        if (unclassifiedTransactions.length > 200) {
          toast({
            title: "Processando...",
            description: `${processedTransactions}/${unclassifiedTransactions.length} transações processadas`,
          });
        }
      }

      // Refresh data after applying all rules
      await fetchData();

      toast({
        title: "Classificação automática aplicada",
        description: `${appliedRules} movimentações foram classificadas automaticamente de um total de ${unclassifiedTransactions.length} transações processadas`,
      });
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
    const headers = ["Data", "Descrição", "Valor", "Tipo", "Grupo", "Natureza", "Tipo de Natureza"];
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
    totalCredits: 0,
    totalDebits: 0,
    classificationPercentage: 0,
    totalTransactionsCount: 0,
  });

  // Fetch summary statistics
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // Get company ID first
        const { data: companies } = await supabase.from("companies").select("id").limit(1);

        if (!companies || companies.length === 0) return;

        const companyId = companies[0].id;

        // Build query with same filters as main query
        let query = supabase
          .from("transactions")
          .select("amount, transaction_type, id, description")
          .eq("company_id", companyId);

        // Apply the same filters as fetchData
        if (searchTerm) {
          query = query.ilike("description", `%${searchTerm}%`);
        }
        if (dateFrom) {
          query = query.gte("transaction_date", format(dateFrom, "yyyy-MM-dd"));
        }
        if (dateTo) {
          query = query.lte("transaction_date", format(dateTo, "yyyy-MM-dd"));
        }

        const { data: allTransactions, error } = await query.limit(100000);

        if (error) {
          console.error("Error fetching summary data:", error);
          return;
        }

        // Get classifications count for filtered transactions
        const transactionIds = allTransactions?.map((t) => t.id) || [];
        let classificationQuery = supabase
          .from("transaction_classifications")
          .select("transaction_id", { count: "exact", head: true });

        if (transactionIds.length > 0) {
          classificationQuery = classificationQuery.in("transaction_id", transactionIds);
        }

        const { count: classifiedCount } = await classificationQuery;

        // Calculate totals

        const totalTransactionsCount = allTransactions?.length || 0;
        const classificationPercentage =
          totalTransactionsCount > 0 ? ((classifiedCount || 0) / totalTransactionsCount) * 100 : 0;

        const totalCredits = allTransactions?.filter((t) => t.transaction_type === "credit").length || 0;

        const totalDebits = allTransactions?.filter((t) => t.transaction_type === "debit").length || 0;

        setSummaryStats({
          totalCredits,
          totalDebits,
          classificationPercentage,
          totalTransactionsCount,
        });
      } catch (error) {
        console.error("Error calculating summary:", error);
      }
    };

    fetchSummary();
  }, [searchTerm, dateFrom, dateTo]);

  // Filter transactions - now just for display since server-side filtering is done
  const filteredTransactions = transactions;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
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
                      {/* NEW: Select Tipo de Natureza */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Tipo de Natureza</Label>
                        <Select
                          value={newRule.commitment_type_id}
                          onValueChange={(value) => {
                            setNewRule((prev) => ({
                              ...prev,
                              commitment_type_id: value,
                              commitment_group_id: "",
                              commitment_id: "",
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de natureza" />
                          </SelectTrigger>
                          <SelectContent>
                            {types.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* MODIFIED: Grupo now filtered by Type */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Grupo de Natureza</Label>
                        <Select
                          value={newRule.commitment_group_id}
                          onValueChange={(value) =>
                            setNewRule((prev) => ({
                              ...prev,
                              commitment_group_id: value,
                              commitment_id: "",
                            }))
                          }
                          disabled={!newRule.commitment_type_id}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !newRule.commitment_type_id
                                  ? "Selecione primeiro o tipo"
                                  : "Selecione o grupo de natureza"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredGroups.length === 0 && newRule.commitment_type_id ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                Nenhum grupo disponível para este tipo
                              </div>
                            ) : (
                              filteredGroups.map((group) => (
                                <SelectItem key={group.id} value={group.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full border-2"
                                      style={{ borderColor: group.color, backgroundColor: `${group.color}20` }}
                                    />
                                    {group.name}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* MODIFIED: Natureza now filtered by Type AND Group */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Natureza</Label>
                        <Select
                          value={newRule.commitment_id}
                          onValueChange={(value) => {
                            setNewRule((prev) => ({
                              ...prev,
                              commitment_id: value,
                            }));
                          }}
                          disabled={!newRule.commitment_group_id}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !newRule.commitment_type_id
                                  ? "Selecione primeiro o tipo"
                                  : !newRule.commitment_group_id
                                  ? "Selecione primeiro o grupo"
                                  : "Selecione a natureza"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCommitments.length === 0 && newRule.commitment_group_id ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                Nenhuma natureza disponível para este grupo e tipo
                              </div>
                            ) : (
                              filteredCommitments.map((commitment) => (
                                <SelectItem key={commitment.id} value={commitment.id}>
                                  {commitment.name}
                                </SelectItem>
                              ))
                            )}
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
            <Button onClick={applyAutomaticClassification} variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Aplicar Regras
            </Button>

            <Button onClick={exportToCSV} variant="outline" size="sm">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="movements" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="movements">Movimentações</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarquia</TabsTrigger>
            <TabsTrigger value="rules">Regras</TabsTrigger>
          </TabsList>

          <TabsContent value="movements" className="space-y-6">
            {/* Summary Cards */}
            {/*<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Créditos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {summaryStats.totalCredits || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Débitos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {summaryStats.totalDebits || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Movimentações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryStats.totalTransactionsCount || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Taxa de Classificação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summaryStats.classificationPercentage.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>*/}

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
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Tipo de Natureza</Label>
                        <Select
                          value={bulkType}
                          onValueChange={(value) => {
                            setBulkType(value);
                            setBulkGroup("");
                            setBulkCommitment("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de natureza" />
                          </SelectTrigger>
                          <SelectContent>
                            {types.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Grupo de Natureza</Label>
                        <Select
                          value={bulkGroup}
                          onValueChange={(value) => {
                            setBulkGroup(value);
                            setBulkCommitment("");
                          }}
                          disabled={!bulkType}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !bulkType
                                  ? "Selecione primeiro o tipo"
                                  : "Selecione o grupo de natureza"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {bulkFilteredGroups.length === 0 && bulkType ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                Nenhum grupo disponível para este tipo
                              </div>
                            ) : (
                              bulkFilteredGroups.map((group) => (
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
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Natureza</Label>
                        <Select value={bulkCommitment} onValueChange={setBulkCommitment} disabled={!bulkGroup}>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !bulkType
                                  ? "Selecione primeiro o tipo"
                                  : !bulkGroup
                                  ? "Selecione primeiro o grupo"
                                  : "Selecione a natureza"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {bulkFilteredCommitments.length === 0 && bulkGroup ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                Nenhuma natureza disponível para este grupo e tipo
                              </div>
                            ) : (
                              bulkFilteredCommitments.map((commitment) => (
                                <SelectItem key={commitment.id} value={commitment.id}>
                                  {commitment.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleBulkClassify} className="flex-1" disabled={!bulkType || !bulkGroup || !bulkCommitment}>
                        <Save className="w-4 h-4 mr-2" />
                        Classificar Selecionadas
                      </Button>
                      <Button variant="destructive" onClick={handleBulkRemoveClassification} className="flex-1">
                        <X className="w-4 h-4 mr-2" />
                        Remover Classificação
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allIds = filteredTransactions.map((t) => t.id);
                      if (selectedTransactions.length === allIds.length) {
                        setSelectedTransactions([]);
                      } else {
                        setSelectedTransactions(allIds);
                      }
                    }}
                  >
                    {selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0
                      ? "Desmarcar Todos"
                      : "Selecionar Todos"}
                  </Button>
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

          <TabsContent value="hierarchy" className="space-y-6">
            {/* Filtro por Tipo de Natureza */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Filtrar por Tipo de Natureza</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os tipos de natureza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos de natureza</SelectItem>
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
                  Hierarquia de Naturezas
                </CardTitle>
                <CardDescription>Estrutura: Tipo de Natureza › Grupo de Natureza › Natureza</CardDescription>
              </CardHeader>
              <CardContent>
                {types.length === 0 ? (
                  <div className="text-center py-8">
                    <TreePine className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma hierarquia criada</h3>
                    <p className="text-muted-foreground mb-4">
                      Crie tipos, grupos e naturezas para organizar suas classificações
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
                                {type.groups.reduce((acc, g) => acc + g.commitments.length, 0)} naturezas
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
                                {/* Grupo de Natureza */}
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
                                        {group.commitments.length} naturezas
                                      </p>
                                    </div>
                                  </div>
                                  <div
                                    className={`transition-transform duration-200 ${expandedGroups.has(group.id) ? "rotate-180" : ""}`}
                                  >
                                    ▼
                                  </div>
                                </div>

                                {/* Naturezas dentro do Grupo */}
                                <div
                                  className={`overflow-hidden transition-all duration-300 ${
                                    expandedGroups.has(group.id) ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                                  }`}
                                >
                                  <div className="px-3 pb-3 space-y-2">
                                    {group.commitments.length === 0 ? (
                                      <div className="ml-6 text-xs text-muted-foreground py-2">
                                        Nenhuma natureza criada neste grupo
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
                  Gerenciar Hierarquia de Naturezas
                </CardTitle>
                <CardDescription>
                  Crie e edite tipos, grupos e naturezas da sua empresa
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
                                  Natureza
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
                <div className="space-y-4">
                  {/* Select Tipo de Natureza */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Tipo de Natureza</Label>
                    <Select
                      value={newRule.commitment_type_id}
                      onValueChange={(value) => {
                        setNewRule((prev) => ({
                          ...prev,
                          commitment_type_id: value,
                          commitment_group_id: "",
                          commitment_id: "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de natureza" />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Grupo filtered by Type */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Grupo de Natureza</Label>
                    <Select
                      value={newRule.commitment_group_id}
                      onValueChange={(value) =>
                        setNewRule((prev) => ({
                          ...prev,
                          commitment_group_id: value,
                          commitment_id: "",
                        }))
                      }
                      disabled={!newRule.commitment_type_id}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !newRule.commitment_type_id
                              ? "Selecione primeiro o tipo"
                              : "Selecione o grupo de natureza"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredGroups.length === 0 && newRule.commitment_type_id ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Nenhum grupo disponível para este tipo
                          </div>
                        ) : (
                          filteredGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full border-2"
                                  style={{ borderColor: group.color, backgroundColor: `${group.color}20` }}
                                />
                                {group.name}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Natureza filtered by Type AND Group */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Natureza</Label>
                    <Select
                      value={newRule.commitment_id}
                      onValueChange={(value) => {
                        setNewRule((prev) => ({
                          ...prev,
                          commitment_id: value,
                        }));
                      }}
                      disabled={!newRule.commitment_group_id}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !newRule.commitment_type_id
                              ? "Selecione primeiro o tipo"
                              : !newRule.commitment_group_id
                              ? "Selecione primeiro o grupo"
                              : "Selecione a natureza"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCommitments.length === 0 && newRule.commitment_group_id ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Nenhuma natureza disponível para este grupo e tipo
                          </div>
                        ) : (
                          filteredCommitments.map((commitment) => (
                            <SelectItem key={commitment.id} value={commitment.id}>
                              {commitment.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
