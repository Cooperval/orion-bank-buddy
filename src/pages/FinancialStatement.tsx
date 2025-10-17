import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { FileText, TrendingUp, TrendingDown, ChevronRight, ChevronDown, TreePine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/components/auth/AuthProvider";

interface TransactionData {
  id: string;
  amount: number;
  transaction_date: string;
  transaction_type: string;
  classification?: {
    commitment?: {
      id?: string;
      name: string;
      commitment_group?: {
        id?: string;
        name: string;
        commitment_type?: {
          id?: string;
          name: string;
        };
      };
      commitment_type?: {
        id?: string;
        name: string;
      };
    };
    commitment_group?: {
      id?: string;
      name: string;
      commitment_type?: {
        id?: string;
        name: string;
      };
    };
    commitment_type?: {
      id?: string;
      name: string;
    };
  };
}

interface MonthlyDREData {
  month: string;
  [key: string]: string | number; // Allow dynamic commitment type totals
}

interface DRELine {
  id: string;
  label: string;
  type: "commitment_type" | "commitment_group" | "commitment" | "unclassified";
  level: number;
  values: number[];
  expandable?: boolean;
  expanded?: boolean;
  parentId?: string;
  children?: DRELine[];
  itemId?: string; // Reference to the actual commitment_type/group/commitment ID
}

interface CommitmentGroupData {
  id: string;
  name: string;
  type: "revenue" | "cost" | "expense";
  values: number[];
  commitments: CommitmentData[];
}

interface CommitmentData {
  id: string;
  name: string;
  values: number[];
}

interface DREConfiguration {
  id: string;
  line_type: "revenue" | "cost" | "expense";
  commitment_group_id: string;
  commitment_id: string | null;
}

interface CommitmentGroup {
  id: string;
  name: string;
  color: string;
  company_id: string;
}

interface Commitment {
  id: string;
  name: string;
  commitment_group_id: string;
  commitment_type_id?: string;
}

interface CommitmentType {
  id: string;
  name: string;
  company_id: string;
}

interface Configs {
  groups: CommitmentGroup[];
  commitments: Commitment[];
  commitmentTypes: CommitmentType[];
  dreConfigurations: DREConfiguration[];
}

const FinancialStatement: React.FC = () => {
  const { companyId } = useAuth();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyDREData[]>([]);
  const [dreLines, setDreLines] = useState<DRELine[]>([]);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  // Configuration state (kept for potential future use)
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isAddCommitmentDialogOpen, setIsAddCommitmentDialogOpen] = useState(false);
  const [selectedLineType, setSelectedLineType] = useState<"revenue" | "cost" | "expense">("revenue");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedCommitmentId, setSelectedCommitmentId] = useState("");
  const [dreConfigurations, setDreConfigurations] = useState<DREConfiguration[]>([]);
  const [groups, setGroups] = useState<CommitmentGroup[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [commitmentTypes, setCommitmentTypes] = useState<CommitmentType[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const currentYear = new Date().getFullYear();
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  // Fetch available years from transactions
  const fetchAvailableYears = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("transaction_date")
        .eq("company_id", companyId)
        .not("transaction_date", "is", null) // Exclui registros com data nula
        .gte("transaction_date", "2020-01-01"); // Filtra apenas anos relevantes

      if (error) {
        console.error("Error fetching available years:", error);
        return;
      }

      console.log("Raw transaction dates found:", data?.length || 0);
      console.log(
        "Sample dates:",
        data?.slice(0, 5).map((d) => d.transaction_date),
      );

      // Extract unique years from transaction dates
      const yearsArray: number[] = [];

      if (data) {
        data.forEach((t) => {
          if (t.transaction_date) {
            try {
              const date = new Date(t.transaction_date);
              const year = date.getFullYear();
              if (!yearsArray.includes(year)) {
                yearsArray.push(year);
              }
            } catch (e) {
              console.warn("Invalid date:", t.transaction_date);
            }
          }
        });
      }

      // Sort descending (most recent first)
      yearsArray.sort((a, b) => b - a);

      console.log("Extracted years:", yearsArray);

      setAvailableYears(yearsArray);

      // If selected year is not in the list, select the most recent year
      if (yearsArray.length > 0 && !yearsArray.includes(selectedYear)) {
        setSelectedYear(yearsArray[0]);
      }
    } catch (error) {
      console.error("Error fetching available years:", error);
    }
  };

  // Helper functions - defined early to avoid hoisting issues
  const getUnclassifiedCommitments = () => {
    const configuredCommitments = new Set(
      dreConfigurations.filter((config) => config.commitment_id).map((config) => config.commitment_id),
    );
    return commitments.filter((commitment) => !configuredCommitments.has(commitment.id));
  };

  const getAvailableGroups = () => {
    const unclassifiedCommitments = getUnclassifiedCommitments();
    const availableGroupIds = new Set(unclassifiedCommitments.map((c) => c.commitment_group_id));
    return groups.filter((group) => availableGroupIds.has(group.id));
  };

  const getCommitmentsForGroup = (groupId: string) => {
    return getUnclassifiedCommitments().filter((c) => c.commitment_group_id === groupId);
  };

  const getConfiguredCommitmentsForLine = (lineType: "revenue" | "cost" | "expense") => {
    return dreConfigurations
      .filter((config) => config.line_type === lineType && config.commitment_id)
      .map((config) => {
        const commitment = commitments.find((c) => c.id === config.commitment_id);
        const group = groups.find((g) => g.id === config.commitment_group_id);
        return {
          config,
          commitment: commitment?.name || "Desconhecido",
          group: group?.name || "Desconhecido",
          groupColor: group?.color || "#6B7280",
        };
      });
  };

  const handleAddCommitment = (lineType: "revenue" | "cost" | "expense") => {
    setSelectedLineType(lineType);
    setSelectedGroupId("");
    setSelectedCommitmentId("");
    setIsAddCommitmentDialogOpen(true);
  };

  const handleSaveCommitment = async () => {
    if (!selectedGroupId || !selectedCommitmentId) {
      toast({
        title: "Seleção incompleta",
        description: "Selecione um grupo e uma natureza",
        variant: "destructive",
      });
      return;
    }
    await handleConfigurationSave(selectedLineType, selectedGroupId, selectedCommitmentId);
    setIsAddCommitmentDialogOpen(false);
  };

  useEffect(() => {
    const loadData = async () => {
      const configs = await fetchConfigurations();
      await fetchTransactionData(configs);
    };

    if (companyId) {
      fetchAvailableYears();
      loadData();
    }

    // Setup real-time listeners
    const transactionChannel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          fetchAvailableYears(); // Update available years when transactions change
          loadData();
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
          loadData();
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
          loadData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dre_line_configurations",
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionChannel);
    };
  }, [selectedYear]);

  const fetchTransactionData = async (configs: Configs) => {
    if (!companyId) return;

    setLoading(true);
    try {
      const startDate = startOfYear(new Date(selectedYear, 0, 1));
      const endDate = endOfYear(new Date(selectedYear, 11, 31));
      // console.log("Fetching transactions for year:", selectedYear);
      // console.log("Date range:", format(startDate, "yyyy-MM-dd"), "to", format(endDate, "yyyy-MM-dd"));

      // First, get all transactions for the year
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select("id, amount, transaction_date, transaction_type, description")
        .eq("company_id", companyId)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd"))
        .order("transaction_date", { ascending: true });

      if (transactionsError) {
        console.error("Error fetching transactions:", transactionsError);
        throw transactionsError;
      }

      // console.log("Raw transactions found:", transactionsData?.length || 0);

      if (!transactionsData || transactionsData.length === 0) {
        // console.log("No transactions found for the specified period");
        setTransactions([]);
        processDataForDRE([]);
        return;
      }

      // Get transaction IDs
      const transactionIds = transactionsData.map((t) => t.id);

      // Helper para dividir array em chunks
      const chunkArray = <T,>(array: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }
        return chunks;
      };

      // Dividir transaction IDs em chunks de 100 para evitar erro "Bad Request"
      const transactionIdChunks = chunkArray(transactionIds, 100);

      // Buscar classificações em paralelo
      const classificationsPromises = transactionIdChunks.map((chunk) =>
        supabase
          .from("transaction_classifications")
          .select("transaction_id, commitment_id, commitment_group_id, commitment_type_id")
          .in("transaction_id", chunk),
      );

      const classificationsResults = await Promise.all(classificationsPromises);

      // Combinar todos os resultados
      let classificationsData: any[] = [];
      let classificationsError = null;

      for (const result of classificationsResults) {
        if (result.error) {
          classificationsError = result.error;
          break;
        }
        if (result.data) {
          classificationsData.push(...result.data);
        }
      }

      if (classificationsError) {
        console.error("Error fetching classifications:", classificationsError);
      }

      // console.log("Classifications found:", classificationsData?.length || 0);

      // Create a map of classifications by transaction_id
      const classificationsMap = new Map();

      // console.log("=== ANTES DO MAPEAMENTO ===");
      // console.log("Classifications found:", classificationsData?.length || 0);
      // console.log("Groups available:", configs.groups.length);
      // console.log("Commitments available:", configs.commitments.length);
      // console.log("Commitment types available:", configs.commitmentTypes.length);

      classificationsData?.forEach((classification) => {
        // A transaction_classifications já tem os 3 IDs que precisamos:
        // - commitment_type_id
        // - commitment_group_id
        // - commitment_id

        let commitmentObj = null;

        if (classification.commitment_id) {
          // Buscar a natureza (commitment) nos dados carregados
          const commitment = configs.commitments.find((c) => c.id === classification.commitment_id);

          // Buscar o grupo usando o ID da classificação (não do commitment)
          const commitmentGroup = configs.groups.find((g) => g.id === classification.commitment_group_id);

          // Buscar o tipo usando o ID da classificação (não do commitment)
          const commitmentType = configs.commitmentTypes.find((ct) => ct.id === classification.commitment_type_id);

          commitmentObj = {
            id: commitment?.id || classification.commitment_id,
            name: commitment?.name || "Natureza Desconhecida",
            commitment_group: commitmentGroup
              ? {
                  id: commitmentGroup.id,
                  name: commitmentGroup.name,
                }
              : null,
            commitment_type: commitmentType
              ? {
                  id: commitmentType.id,
                  name: commitmentType.name,
                }
              : null,
          };
        }

        classificationsMap.set(classification.transaction_id, {
          commitment: commitmentObj,
          commitment_group: classification.commitment_group_id
            ? configs.groups.find((g) => g.id === classification.commitment_group_id)
            : null,
          commitment_type: classification.commitment_type_id
            ? configs.commitmentTypes.find((ct) => ct.id === classification.commitment_type_id)
            : null,
        });
      });

      // console.log("=== DEPOIS DO MAPEAMENTO ===");
      // console.log("Classifications map size:", classificationsMap.size);
      if (classificationsMap.size > 0) {
        const firstClassification = Array.from(classificationsMap.values())[0];
        // console.log("Sample classification:", JSON.stringify(firstClassification, null, 2));
      }

      // Combine transaction data with classifications
      const processedData = transactionsData.map((transaction) => ({
        ...transaction,
        classification: classificationsMap.get(transaction.id) || null,
      }));

      // console.log("Processed transactions:", processedData.length);
      // console.log("Sample transaction:", processedData[0]);

      setTransactions(processedData);
      processDataForDRE(processedData);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigurations = async (): Promise<Configs> => {
    try {
      // Fetch DRE configurations
      const { data: configData, error: configError } = await supabase.from("dre_line_configurations").select("*");

      if (configError) throw configError;

      const dreConfigs =
        configData?.map((config) => ({
          ...config,
          line_type: config.line_type as "revenue" | "cost" | "expense",
        })) || [];

      setDreConfigurations(dreConfigs);

      // Fetch commitment groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("commitment_groups")
        .select("*")
        .eq("is_active", true);

      if (groupsError) throw groupsError;

      const grps = groupsData || [];
      setGroups(grps);

      // Fetch commitments
      const { data: commitmentsData, error: commitmentsError } = await supabase
        .from("commitments")
        .select("*")
        .eq("is_active", true);

      if (commitmentsError) throw commitmentsError;

      const cmts = commitmentsData || [];
      setCommitments(cmts);

      // Fetch commitment types
      const { data: commitmentTypesData, error: commitmentTypesError } = await supabase
        .from("commitment_types")
        .select("*")
        .eq("is_active", true);

      if (commitmentTypesError) throw commitmentTypesError;

      const ctypes = commitmentTypesData || [];
      setCommitmentTypes(ctypes);

      return {
        groups: grps,
        commitments: cmts,
        commitmentTypes: ctypes,
        dreConfigurations: dreConfigs,
      };
    } catch (error) {
      console.error("Error fetching configurations:", error);
      return {
        groups: [],
        commitments: [],
        commitmentTypes: [],
        dreConfigurations: [],
      };
    }
  };

  const processDataForDRE = (transactions: TransactionData[]) => {
    // Create hierarchical data structure based on commitment types → groups → commitments
    const hierarchyMap = new Map<
      string,
      {
        type: CommitmentType;
        groups: Map<
          string,
          {
            group: CommitmentGroup;
            commitments: Map<
              string,
              {
                commitment: Commitment;
                values: number[];
              }
            >;
            values: number[];
          }
        >;
        values: number[];
      }
    >();

    // Initialize months data
    const monthlyResults: MonthlyDREData[] = [];
    for (let i = 0; i < 12; i++) {
      monthlyResults.push({ month: months[i] });
    }

    // Flag para log único
    let hasLoggedSample = false;

    // Process each transaction
    transactions.forEach((transaction) => {
      const monthIndex = new Date(transaction.transaction_date).getMonth();
      // Apply debit/credit logic: credits are positive, debits are negative
      const amount =
        transaction.transaction_type === "credit" ? Math.abs(transaction.amount) : -Math.abs(transaction.amount);

      // Extract hierarchy information from classification
      const classification = transaction.classification;

      // Log para debug - verificar estrutura da classificação (apenas uma vez)
      if (!hasLoggedSample && classification) {
        // console.log("=== ESTRUTURA DA CLASSIFICAÇÃO (sample) ===");
        // console.log("classification.commitment:", classification.commitment);
        // console.log("classification.commitment_group:", classification.commitment_group);
        // console.log("classification.commitment_type:", classification.commitment_type);
        hasLoggedSample = true;
      }

      let commitmentTypeId: string;
      let commitmentTypeName: string;
      let commitmentGroupId: string;
      let commitmentGroupName: string;
      let commitmentId: string;
      let commitmentName: string;

      if (classification?.commitment) {
        // Full classification with commitment
        commitmentId = classification.commitment.id || "unknown";
        commitmentName = classification.commitment.name;
        // Usar os dados do nível superior do classification, não do commitment aninhado
        commitmentGroupId = classification.commitment_group?.id || "unknown";
        commitmentGroupName = classification.commitment_group?.name || "Grupo Desconhecido";
        commitmentTypeId = classification.commitment_type?.id || "unknown";
        commitmentTypeName = classification.commitment_type?.name || "Tipo Desconhecido";
      } else if (classification?.commitment_group) {
        // Group classification only
        commitmentId = "outros";
        commitmentName = "Outros";
        commitmentGroupId = classification.commitment_group.id || "unknown";
        commitmentGroupName = classification.commitment_group.name;
        commitmentTypeId = classification.commitment_type?.id || "unknown";
        commitmentTypeName = classification.commitment_type?.name || "Tipo Desconhecido";
      } else if (classification?.commitment_type) {
        // Type classification only
        commitmentId = "outros";
        commitmentName = "Outros";
        commitmentGroupId = "outros";
        commitmentGroupName = "Outros";
        commitmentTypeId = classification.commitment_type.id || "unknown";
        commitmentTypeName = classification.commitment_type.name;
      } else {
        // No classification
        commitmentId = "nao-classificado";
        commitmentName = "Não Classificado";
        commitmentGroupId = "nao-classificado";
        commitmentGroupName = "Não Classificado";
        commitmentTypeId = "nao-classificado";
        commitmentTypeName = "Não Classificado";
      }

      // Initialize type if not exists
      if (!hierarchyMap.has(commitmentTypeId)) {
        hierarchyMap.set(commitmentTypeId, {
          type: {
            id: commitmentTypeId,
            name: commitmentTypeName,
            company_id: "",
          },
          groups: new Map(),
          values: new Array(12).fill(0),
        });
      }
      const typeData = hierarchyMap.get(commitmentTypeId)!;
      typeData.values[monthIndex] += amount;

      // Initialize group if not exists
      if (!typeData.groups.has(commitmentGroupId)) {
        typeData.groups.set(commitmentGroupId, {
          group: {
            id: commitmentGroupId,
            name: commitmentGroupName,
            color: "#6B7280",
            company_id: "",
          },
          commitments: new Map(),
          values: new Array(12).fill(0),
        });
      }
      const groupData = typeData.groups.get(commitmentGroupId)!;
      groupData.values[monthIndex] += amount;

      // Initialize commitment if not exists
      if (!groupData.commitments.has(commitmentId)) {
        groupData.commitments.set(commitmentId, {
          commitment: {
            id: commitmentId,
            name: commitmentName,
            commitment_group_id: commitmentGroupId,
          },
          values: new Array(12).fill(0),
        });
      }
      const commitmentData = groupData.commitments.get(commitmentId)!;
      commitmentData.values[monthIndex] += amount;
    });

    setMonthlyData(monthlyResults);

    // Create hierarchical DRE structure
    const lines: DRELine[] = [];

    // Build the hierarchical lines
    hierarchyMap.forEach((typeData, typeId) => {
      // Add commitment type line
      lines.push({
        id: `type-${typeId}`,
        label: typeData.type.name,
        type: "commitment_type",
        level: 0,
        values: typeData.values,
        expandable: typeData.groups.size > 0,
        expanded: false,
        itemId: typeId,
      });

      // Add commitment groups
      typeData.groups.forEach((groupData, groupId) => {
        lines.push({
          id: `group-${groupId}`,
          label: `  ${groupData.group.name}`,
          type: "commitment_group",
          level: 1,
          values: groupData.values,
          expandable: groupData.commitments.size > 0,
          expanded: false,
          parentId: `type-${typeId}`,
          itemId: groupId,
        });

        // Add commitments
        groupData.commitments.forEach((commitmentData, commitmentId) => {
          lines.push({
            id: `commitment-${commitmentId}`,
            label: `    ${commitmentData.commitment.name}`,
            type: "commitment",
            level: 2,
            values: commitmentData.values,
            expandable: false,
            parentId: `group-${groupId}`,
            itemId: commitmentId,
          });
        });
      });
    });

    setDreLines(lines);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getValueIcon = (value: number, type: string) => {
    if (type === "commitment_type" && value > 0) {
      return;
    }
    if (type === "commitment_type" && value < 0) {
      return;
    }
    return null;
  };

  const toggleLineExpansion = (lineId: string) => {
    setExpandedLines((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lineId)) {
        newSet.delete(lineId);
      } else {
        newSet.add(lineId);
      }
      return newSet;
    });
  };

  const isLineVisible = (line: DRELine): boolean => {
    if (line.level === 0) return true;
    if (!line.parentId) return true;
    const parentExpanded = expandedLines.has(line.parentId);
    if (!parentExpanded) return false;

    // Check if all parent levels are expanded
    const parentLine = dreLines.find((l) => l.id === line.parentId);
    if (parentLine && parentLine.level > 0) {
      return isLineVisible(parentLine);
    }
    return true;
  };

  const getRowClassName = (type: string, level: number) => {
    let baseClass = "";
    switch (type) {
      case "commitment_type":
        baseClass = level === 0 ? "bg-primary/5 font-bold border-t border-primary/20" : "";
        break;
      case "commitment_group":
        baseClass = "text-card-foreground font-medium bg-secondary/10";
        break;
      case "commitment":
        baseClass = "text-card-foreground";
        break;
      case "unclassified":
        baseClass = "text-card-foreground font-medium bg-warning/10 dark:bg-warning/20";
        break;
      default:
        baseClass = "";
    }
    if (level > 0) {
      baseClass += " hover:bg-secondary/20 transition-colors";
    }
    return baseClass;
  };

  const handleConfigurationSave = async (
    lineType: "revenue" | "cost" | "expense",
    groupId: string,
    commitmentId?: string,
  ) => {
    try {
      setConfigLoading(true);

      // First, remove any existing configuration for this group/commitment
      if (commitmentId) {
        await supabase
          .from("dre_line_configurations")
          .delete()
          .eq("commitment_group_id", groupId)
          .eq("commitment_id", commitmentId);
      } else {
        await supabase
          .from("dre_line_configurations")
          .delete()
          .eq("commitment_group_id", groupId)
          .is("commitment_id", null);
      }

      // Insert new configuration
      // Get company_id from the first available group since all groups belong to companies
      const selectedGroup = groups.find((g) => g.id === groupId);
      const companyId = selectedGroup?.company_id;
      if (!companyId) {
        throw new Error("Company ID not found");
      }

      const { error } = await supabase.from("dre_line_configurations").insert({
        line_type: lineType,
        commitment_group_id: groupId,
        commitment_id: commitmentId || null,
        company_id: companyId,
      });

      if (error) throw error;

      toast({
        title: "Configuração salva",
        description: "A configuração da DRE foi atualizada com sucesso",
      });

      const config = await fetchConfigurations();
      await fetchTransactionData(config); // Refresh data to apply new configuration
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a configuração",
        variant: "destructive",
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const handleConfigurationRemove = async (groupId: string, commitmentId?: string) => {
    try {
      setConfigLoading(true);
      let query = supabase.from("dre_line_configurations").delete().eq("commitment_group_id", groupId);
      if (commitmentId) {
        query = query.eq("commitment_id", commitmentId);
      } else {
        query = query.is("commitment_id", null);
      }
      const { error } = await query;
      if (error) throw error;

      toast({
        title: "Configuração removida",
        description: "A configuração foi removida com sucesso",
      });

      const config = await fetchConfigurations();
      await fetchTransactionData(config); // Refresh data to apply changes
    } catch (error) {
      console.error("Error removing configuration:", error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a configuração",
        variant: "destructive",
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const getConfigurationForItem = (groupId: string, commitmentId?: string) => {
    return dreConfigurations.find(
      (c) => c.commitment_group_id === groupId && (commitmentId ? c.commitment_id === commitmentId : !c.commitment_id),
    );
  };

  const getLineTypeLabel = (type: "revenue" | "cost" | "expense") => {
    switch (type) {
      case "revenue":
        return "Receita";
      case "cost":
        return "Custo";
      case "expense":
        return "Despesa";
    }
  };

  const getLineTypeColor = (type: "revenue" | "cost" | "expense") => {
    switch (type) {
      case "revenue":
        return "bg-green-100 text-green-800 border-green-200";
      case "cost":
        return "bg-red-100 text-red-800 border-red-200";
      case "expense":
        return "bg-orange-100 text-orange-800 border-orange-200";
    }
  };

  const monthlyTotals = useMemo(() => {
    const totals = new Array(12).fill(0);
    dreLines.forEach((l) => {
      if (l.level === 0) {
        l.values.forEach((v, i) => {
          totals[i] += v;
        });
      }
    });
    return totals;
  }, [dreLines]);

  const grandTotal = useMemo(() => monthlyTotals.reduce((acc, v) => acc + v, 0), [monthlyTotals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.length > 0 ? (
                availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-card">
        {/*<CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreePine className="w-5 h-5" />
            Hierarquia de Naturezas - {selectedYear}
          </CardTitle>
          <CardDescription>Estrutura: Tipo de Natureza › Grupo de Natureza › Natureza</CardDescription>
        </CardHeader>*/}
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px] font-semibold">Descrição</TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="text-center font-semibold min-w-[120px]">
                      {month}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-semibold min-w-[120px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dreLines.filter(isLineVisible).map((line) => {
                  const total = line.values.reduce((sum, value) => sum + value, 0);
                  const isExpanded = expandedLines.has(line.id);
                  return (
                    <TableRow
                      key={line.id}
                      className={`${getRowClassName(line.type, line.level)} ${line.expandable ? "cursor-pointer" : ""} animate-fade-in`}
                      onClick={() => line.expandable && toggleLineExpansion(line.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {line.expandable && (
                            <div className="transition-transform duration-200">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-card-foreground/70" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-card-foreground/70" />
                              )}
                            </div>
                          )}
                          {getValueIcon(total, line.type)}
                          <div>
                            <span
                              className={
                                line.type === "commitment_type"
                                  ? "font-semibold text-lg text-card-foreground"
                                  : line.type === "commitment_group"
                                    ? "font-medium text-card-foreground"
                                    : "font-normal text-card-foreground"
                              }
                            >
                              {line.label}
                            </span>
                            {line.type === "commitment_type"}
                            {line.type === "commitment_group"}
                          </div>
                        </div>
                      </TableCell>

                      {line.values.map((value, monthIndex) => (
                        <TableCell key={monthIndex} className="text-center">
                          <span
                            className={
                              value > 0
                                ? "text-success dark:text-success"
                                : value < 0
                                  ? "text-destructive dark:text-destructive"
                                  : "text-card-foreground/60"
                            }
                          >
                            {formatCurrency(value)}
                          </span>
                        </TableCell>
                      ))}

                      <TableCell className="text-center font-semibold">
                        <span
                          className={
                            total > 0
                              ? "text-success dark:text-success"
                              : total < 0
                                ? "text-destructive dark:text-destructive"
                                : "text-card-foreground/60"
                          }
                        >
                          {formatCurrency(total)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* ====== Linha de TOTAL (por mês + geral) ====== */}
                <TableRow className="bg-primary/10 font-bold border-t border-primary/30">
                  <TableCell className="uppercase tracking-wide text-card-foreground">Total</TableCell>
                  {monthlyTotals.map((value, i) => (
                    <TableCell key={i} className="text-center">
                      <span
                        className={
                          value > 0
                            ? "text-success dark:text-success"
                            : value < 0
                              ? "text-destructive dark:text-destructive"
                              : "text-card-foreground/60"
                        }
                      >
                        {formatCurrency(value)}
                      </span>
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <span
                      className={
                        grandTotal > 0
                          ? "text-success dark:text-success"
                          : grandTotal < 0
                            ? "text-destructive dark:text-destructive"
                            : "text-card-foreground/60"
                      }
                    >
                      {formatCurrency(grandTotal)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-sm text-card-foreground/70">Total de Tipos de Natureza</div>
            <div className="text-2xl font-bold text-primary">{commitmentTypes.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="text-sm text-card-foreground/70">Total de Transações</div>
            <div className="text-2xl font-bold text-primary">{transactions.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="text-sm text-card-foreground/80">
            <strong className="text-card-foreground">Nota:</strong> Este demonstrativo apresenta a organização
            hierárquica dos dados financeiros baseada nos tipos de natureza, grupos de natureza e naturezas individuais
            conforme cadastrados no sistema. Os valores são compostos pelas movimentações bancárias classificadas e
            atualizados em tempo real.
          </div>
        </CardContent>
      </Card>*/}
    </div>
  );
};

export default FinancialStatement;
