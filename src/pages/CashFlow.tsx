import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { TrendingUp, TrendingDown, Calendar, DollarSign, ArrowUpDown, Plus, CreditCard, Receipt, Edit, Trash2, ChevronDown, ChevronUp, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from 'xlsx';

interface CashFlowItem {
  date: string;
  description: string;
  amount: number;
  type: 'historical' | 'payable' | 'receivable';
  status?: string;
  bank_id?: string;
  classification?: {
    group?: string;
    commitment?: string;
    commitmentType?: string;
  };
}

interface BankInfo {
  id: string;
  bank_name: string;
  account_number: string;
}

interface DailyCashFlow {
  day: number;
  date: string;
  opening: number;
  historicalIn: number;
  historicalOut: number;
  projectedIn: number;
  projectedOut: number;
  closing: number;
  items: CashFlowItem[];
}

interface BankCashFlow {
  bank: BankInfo;
  days: DailyCashFlow[];
  totalOpening: number;
  totalHistoricalIn: number;
  totalHistoricalOut: number;
  totalProjectedIn: number;
  totalProjectedOut: number;
  totalClosing: number;
}

interface MonthlyCashFlow {
  month: string;
  banks: BankCashFlow[];
  totalOpening: number;
  totalHistoricalIn: number;
  totalHistoricalOut: number;
  totalProjectedIn: number;
  totalProjectedOut: number;
  totalClosing: number;
}

const futureEntrySchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Valor deve ser um número positivo"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  entry_type: z.enum(["payable", "receivable"], {
    required_error: "Tipo de lançamento é obrigatório",
  }),
  commitment_group_id: z.string().optional(),
  commitment_id: z.string().optional(),
  commitment_type_id: z.string().optional(),
  notes: z.string().optional(),
});

type FutureEntryForm = z.infer<typeof futureEntrySchema>;

export default function CashFlow() {
  const { companyId } = useAuth();
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [dayRange, setDayRange] = useState({ start: 1, end: 31 });
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [expandedBanks, setExpandedBanks] = useState<Record<string, boolean>>({});
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});
  const [showEmptyAccounts, setShowEmptyAccounts] = useState(false);

  const [monthlyData, setMonthlyData] = useState<MonthlyCashFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [futureEntries, setFutureEntries] = useState<any[]>([]);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [commitmentGroups, setCommitmentGroups] = useState<any[]>([]);
  const [commitments, setCommitments] = useState<any[]>([]);
  const [commitmentTypes, setCommitmentTypes] = useState<any[]>([]);
  const [filterDescription, setFilterDescription] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const { toast } = useToast();

  const form = useForm<FutureEntryForm>({
    resolver: zodResolver(futureEntrySchema),
    defaultValues: {
      description: "",
      amount: "",
      due_date: "",
      entry_type: "payable",
      commitment_group_id: "",
      commitment_id: "",
      commitment_type_id: "",
      notes: "",
    },
  });

  const loadCashFlowData = async () => {
    setLoading(true);
    try {
      if (!companyId) return;
      
      // First load all banks
      const { data: banksData } = await supabase
        .from('banks')
        .select('id, bank_name, account_number')
        .eq('company_id', companyId)
        .order('bank_name');

      // Get available months from both transactions and future entries
      const [transactionDatesResult, futureEntriesResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('transaction_date')
          .eq('company_id', companyId)
          .order('transaction_date', { ascending: true }),
        supabase
          .from('future_entries')
          .select('due_date')
          .eq('company_id', companyId)
          .order('due_date', { ascending: true })
      ]);

      // Combine dates from both sources
      const allDates = [
        ...(transactionDatesResult.data || []).map(t => t.transaction_date),
        ...(futureEntriesResult.data || []).map(fe => fe.due_date)
      ];

      if (allDates.length === 0) {
        setMonthlyData([]);
        setAvailableMonths([]);
        setLoading(false);
        return;
      }

      // Get unique year-months from all available data
      const availableMonthsList = Array.from(new Set(
        allDates.map(date => format(parseISO(date), 'yyyy-MM'))
      )).sort();

      setAvailableMonths(availableMonthsList);
      const allMonthsList = availableMonthsList;

      const months: MonthlyCashFlow[] = [];

      for (const monthKey of allMonthsList) {
        const monthDate = parseISO(monthKey + '-01');
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const daysInMonth = monthEnd.getDate();

        const bankCashFlows: BankCashFlow[] = [];

        // Future entries (load for all months)
        const { data: futureEntries } = await supabase
          .from('future_entries')
          .select('id, amount, due_date, description, entry_type, status, commitment_group_id, commitment_id, commitment_type_id')
          .eq('company_id', companyId)
          .gte('due_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('due_date', format(monthEnd, 'yyyy-MM-dd'))
          .order('due_date', { ascending: true });

        // Get commitment data for future entries
        const commitmentGroupIds = [...new Set(futureEntries?.map(fe => fe.commitment_group_id).filter(Boolean) || [])];
        const commitmentIds = [...new Set(futureEntries?.map(fe => fe.commitment_id).filter(Boolean) || [])];
        const commitmentTypeIds = [...new Set(futureEntries?.map(fe => fe.commitment_type_id).filter(Boolean) || [])];

        const [commitmentGroupsData, commitmentsData, commitmentTypesData] = await Promise.all([
          commitmentGroupIds.length > 0 ? supabase
            .from('commitment_groups')
            .select('id, name')
            .eq('company_id', companyId)
            .in('id', commitmentGroupIds) : Promise.resolve({ data: [] }),
          commitmentIds.length > 0 ? supabase
            .from('commitments')
            .select('id, name')
            .eq('company_id', companyId)
            .in('id', commitmentIds) : Promise.resolve({ data: [] }),
          commitmentTypeIds.length > 0 ? supabase
            .from('commitment_types')
            .select('id, name')
            .eq('company_id', companyId)
            .in('id', commitmentTypeIds) : Promise.resolve({ data: [] }),
        ]);

        // Create lookup maps
        const groupsMap = new Map((commitmentGroupsData.data || []).map(g => [g.id, g.name]));
        const commitmentsMap = new Map((commitmentsData.data || []).map(c => [c.id, c.name]));
        const typesMap = new Map((commitmentTypesData.data || []).map(t => [t.id, t.name]));

        // Process banks if they exist, and add a "manual" bank only if there are future entries
        const banksToProcess = [
          ...(banksData || []),
          ...((futureEntries && futureEntries.length > 0) ? [{ id: 'manual', bank_name: 'Lançamentos Manuais', account_number: '' }] : [])
        ];

        for (const bank of banksToProcess) {
          // Historical transactions for this bank (only if it's a real bank, not manual)
          let transactions = [];
          if (bank.id !== 'manual') {
            const { data: transactionData } = await supabase
              .from('transactions')
              .select(`
                id, amount, transaction_date, description, transaction_type, bank_id,
                transaction_classifications(
                  commitment_groups(name),
                  commitments(name),
                  commitment_types(name)
                )
              `)
              .eq('bank_id', bank.id)
              .eq('company_id', companyId)
              .gte('transaction_date', format(monthStart, 'yyyy-MM-dd'))
              .lte('transaction_date', format(monthEnd, 'yyyy-MM-dd'))
              .order('transaction_date', { ascending: true });
            transactions = transactionData || [];
          }

          // Create daily breakdown for this bank
          const days: DailyCashFlow[] = [];
          let runningBalance = 0;

          for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
            const dayString = format(dayDate, 'yyyy-MM-dd');

            const dayItems: CashFlowItem[] = [];
            let dayHistoricalIn = 0;
            let dayHistoricalOut = 0;
            let dayProjectedIn = 0;
            let dayProjectedOut = 0;

            // Process historical transactions for this day and bank
            (transactions || []).forEach(t => {
              if (t.transaction_date === dayString) {
                const amount = Number(t.amount);
                const classification = t.transaction_classifications?.[0];

                dayItems.push({
                  date: t.transaction_date,
                  description: t.description,
                  amount: t.transaction_type === 'credit' ? amount : -amount,
                  type: 'historical',
                  bank_id: t.bank_id,
                  classification: {
                    group: classification?.commitment_groups?.name,
                    commitment: classification?.commitments?.name,
                    commitmentType: classification?.commitment_types?.name,
                  }
                });

                if (t.transaction_type === 'credit') {
                  dayHistoricalIn += amount;
                } else {
                  dayHistoricalOut += amount;
                }
              }
            });

            // Process future entries for this day (only for manual bank)
            if (bank.id === 'manual') {
              (futureEntries || []).forEach(fe => {
                if (fe.due_date === dayString) {
                  const amount = Number(fe.amount);

                  dayItems.push({
                    date: fe.due_date,
                    description: fe.description,
                    amount: amount,
                    type: fe.entry_type as 'payable' | 'receivable',
                    status: fe.status,
                    classification: {
                      group: fe.commitment_group_id ? groupsMap.get(fe.commitment_group_id) : undefined,
                      commitment: fe.commitment_id ? commitmentsMap.get(fe.commitment_id) : undefined,
                      commitmentType: fe.commitment_type_id ? typesMap.get(fe.commitment_type_id) : undefined,
                    }
                  });

                  if (fe.entry_type === 'receivable') {
                    dayProjectedIn += amount;
                  } else {
                    dayProjectedOut += amount;
                  }
                }
              });
            }

            const dayClosing = runningBalance + dayHistoricalIn - dayHistoricalOut + dayProjectedIn - dayProjectedOut;

            days.push({
              day: day,
              date: dayString,
              opening: runningBalance,
              historicalIn: dayHistoricalIn,
              historicalOut: dayHistoricalOut,
              projectedIn: dayProjectedIn,
              projectedOut: dayProjectedOut,
              closing: dayClosing,
              items: dayItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            });

            runningBalance = dayClosing;
          }

          // Calculate bank totals
          const totalHistoricalIn = days.reduce((sum, day) => sum + day.historicalIn, 0);
          const totalHistoricalOut = days.reduce((sum, day) => sum + day.historicalOut, 0);
          const totalProjectedIn = days.reduce((sum, day) => sum + day.projectedIn, 0);
          const totalProjectedOut = days.reduce((sum, day) => sum + day.projectedOut, 0);

          bankCashFlows.push({
            bank: {
              id: bank.id,
              bank_name: bank.bank_name,
              account_number: bank.account_number,
            },
            days: days,
            totalOpening: days[0]?.opening || 0,
            totalHistoricalIn,
            totalHistoricalOut,
            totalProjectedIn,
            totalProjectedOut,
            totalClosing: days[days.length - 1]?.closing || 0,
          });
        }

        // Calculate month totals across all banks
        const totalHistoricalIn = bankCashFlows.reduce((sum, bank) => sum + bank.totalHistoricalIn, 0);
        const totalHistoricalOut = bankCashFlows.reduce((sum, bank) => sum + bank.totalHistoricalOut, 0);
        const totalProjectedIn = bankCashFlows.reduce((sum, bank) => sum + bank.totalProjectedIn, 0);
        const totalProjectedOut = bankCashFlows.reduce((sum, bank) => sum + bank.totalProjectedOut, 0);

        months.push({
          month: monthKey,
          banks: bankCashFlows,
          totalOpening: bankCashFlows.reduce((sum, bank) => sum + bank.totalOpening, 0),
          totalHistoricalIn,
          totalHistoricalOut,
          totalProjectedIn,
          totalProjectedOut,
          totalClosing: bankCashFlows.reduce((sum, bank) => sum + bank.totalClosing, 0),
        });
      }

      setMonthlyData(months);
    } catch (error) {
      console.error('Error loading cash flow data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do fluxo de caixa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função separada para carregar apenas os meses disponíveis
  const loadAvailableMonths = async () => {
    try {
      if (!companyId) return;
      
      // Get available months from both transactions and future entries
      const [transactionDatesResult, futureEntriesResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('transaction_date')
          .eq('company_id', companyId)
          .order('transaction_date', { ascending: true }),
        supabase
          .from('future_entries')
          .select('due_date')
          .eq('company_id', companyId)
          .order('due_date', { ascending: true })
      ]);

      // Combine dates from both sources
      const allDates = [
        ...(transactionDatesResult.data || []).map(t => t.transaction_date),
        ...(futureEntriesResult.data || []).map(fe => fe.due_date)
      ];

      if (allDates.length === 0) {
        setAvailableMonths([]);
        return;
      }

      // Get unique year-months from all available data
      const availableMonthsList = Array.from(new Set(
        allDates.map(date => format(parseISO(date), 'yyyy-MM'))
      )).sort();

      setAvailableMonths(availableMonthsList);
    } catch (error) {
      console.error('Error loading available months:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os meses disponíveis",
        variant: "destructive",
      });
    }
  };

  // Removido carregamento automático - dados são carregados apenas ao selecionar mês
  useEffect(() => {
    loadAvailableMonths(); // Carrega apenas os meses disponíveis
  }, [companyId]);

  useEffect(() => {
    const loadCommitmentData = async () => {
      try {
        if (!companyId) return;
        
        // Load commitment groups
        const { data: groups, error: groupsError } = await supabase
          .from('commitment_groups')
          .select('id, name')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('name');

        if (groupsError) throw groupsError;
        setCommitmentGroups(groups || []);

        // Load commitments with their commitment types
        const { data: commitmentData, error: commitmentsError } = await supabase
          .from('commitments')
          .select('id, name, commitment_group_id, commitment_type_id')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('name');

        if (commitmentsError) throw commitmentsError;
        setCommitments(commitmentData || []);

        // Load commitment types
        const { data: types, error: typesError } = await supabase
          .from('commitment_types')
          .select('id, name')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('name');

        if (typesError) throw typesError;
        setCommitmentTypes(types || []);
      } catch (error) {
        console.error('Error loading commitment data:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados de classificação",
          variant: "destructive",
        });
      }
    };
    loadCommitmentData();
  }, [companyId]);

  const selectedGroupId = form.watch("commitment_group_id");
  const selectedCommitmentId = form.watch("commitment_id");

  // Filter commitments based on selected group
  const filteredCommitments = commitments.filter(c =>
    !selectedGroupId || c.commitment_group_id === selectedGroupId
  );

  // Auto-set commitment type when commitment is selected
  useEffect(() => {
    if (selectedCommitmentId && selectedCommitmentId !== "none") {
      const selectedCommitment = commitments.find(c => c.id === selectedCommitmentId);
      if (selectedCommitment?.commitment_type_id) {
        form.setValue("commitment_type_id", selectedCommitment.commitment_type_id);
      } else {
        form.setValue("commitment_type_id", "");
      }
    } else {
      form.setValue("commitment_type_id", "");
    }
  }, [selectedCommitmentId, commitments, form]);

  const getFilteredData = () => {
    const filteredMonths = selectedMonths.length > 0
      ? monthlyData.filter(month => selectedMonths.includes(month.month))
      : monthlyData;

    // If no months are found, return empty array
    if (filteredMonths.length === 0) {
      return [];
    }

    // Aggregate all banks data across filtered months
    const bankAggregates = new Map<string, BankCashFlow>();

    filteredMonths.forEach(month => {
      month.banks.forEach(bankData => {
        const bankId = bankData.bank.id;

        if (!bankAggregates.has(bankId)) {
          bankAggregates.set(bankId, {
            bank: bankData.bank,
            days: [],
            totalOpening: 0,
            totalHistoricalIn: 0,
            totalHistoricalOut: 0,
            totalProjectedIn: 0,
            totalProjectedOut: 0,
            totalClosing: 0,
          });
        }

        const aggregate = bankAggregates.get(bankId)!;

        // Filter days by day range
        const filteredDays = bankData.days.filter(day =>
          day.day >= dayRange.start && day.day <= dayRange.end
        );

        aggregate.days.push(...filteredDays);
        aggregate.totalHistoricalIn += bankData.totalHistoricalIn;
        aggregate.totalHistoricalOut += bankData.totalHistoricalOut;
        aggregate.totalProjectedIn += bankData.totalProjectedIn;
        aggregate.totalProjectedOut += bankData.totalProjectedOut;
      });
    });

    // Calculate correct closing balance for each bank after aggregation
    bankAggregates.forEach((aggregate, bankId) => {
      if (aggregate.days.length === 0) return;
      
      // Sort days by date to calculate running balance correctly
      aggregate.days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Get opening balance from first day
      aggregate.totalOpening = aggregate.days[0]?.opening || 0;
      
      // Calculate closing balance: opening + total in - total out + projected in - projected out
      aggregate.totalClosing = aggregate.totalOpening + 
        aggregate.totalHistoricalIn - 
        aggregate.totalHistoricalOut + 
        aggregate.totalProjectedIn - 
        aggregate.totalProjectedOut;
    });

    return Array.from(bankAggregates.values()).filter(bank => {
      const hasMovement = 
        bank.totalHistoricalIn > 0 || 
        bank.totalHistoricalOut > 0 || 
        bank.totalProjectedIn > 0 || 
        bank.totalProjectedOut > 0;
      
      return bank.days.length > 0 && (showEmptyAccounts || hasMovement);
    });
  };

  const filteredData = getFilteredData();

  const toggleBankExpansion = (bankId: string) => {
    setExpandedBanks(prev => ({
      ...prev,
      [bankId]: !prev[bankId]
    }));
  };

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const toggleCellDetails = (cellId: string) => {
    setExpandedCells(prev => ({
      ...prev,
      [cellId]: !prev[cellId]
    }));
  };

  const getCellItems = (day: DailyCashFlow, type: 'historicalIn' | 'historicalOut' | 'projectedIn' | 'projectedOut') => {
    const items = day.items.filter(item => {
      switch (type) {
        case 'historicalIn':
          return item.type === 'historical' && item.amount > 0;
        case 'historicalOut':
          return item.type === 'historical' && item.amount < 0;
        case 'projectedIn':
          return item.type === 'receivable';
        case 'projectedOut':
          return item.type === 'payable';
        default:
          return false;
      }
    });
    return items;
  };

  const loadFutureEntries = async () => {
    try {
      if (!companyId) return;
      
      const { data, error } = await supabase
        .from('future_entries')
        .select(`
          id, description, amount, due_date, entry_type, status, notes,
          commitment_group_id, commitment_id, commitment_type_id
        `)
        .eq('company_id', companyId)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Load related data separately
      const groupIds = [...new Set(data?.map(fe => fe.commitment_group_id).filter(Boolean))];
      const commitmentIds = [...new Set(data?.map(fe => fe.commitment_id).filter(Boolean))];
      const typeIds = [...new Set(data?.map(fe => fe.commitment_type_id).filter(Boolean))];

      const [groupsData, commitmentsData, typesData] = await Promise.all([
        groupIds.length > 0 ? supabase
          .from('commitment_groups')
          .select('id, name')
          .eq('company_id', companyId)
          .in('id', groupIds) : Promise.resolve({ data: [] }),
        commitmentIds.length > 0 ? supabase
          .from('commitments')
          .select('id, name')
          .eq('company_id', companyId)
          .in('id', commitmentIds) : Promise.resolve({ data: [] }),
        typeIds.length > 0 ? supabase
          .from('commitment_types')
          .select('id, name')
          .eq('company_id', companyId)
          .in('id', typeIds) : Promise.resolve({ data: [] }),
      ]);

      // Create lookup maps
      const groupsMap = new Map((groupsData.data || []).map(g => [g.id, g.name]));
      const commitmentsMap = new Map((commitmentsData.data || []).map(c => [c.id, c.name]));
      const typesMap = new Map((typesData.data || []).map(t => [t.id, t.name]));

      // Merge the data
      const enrichedEntries = (data || []).map(entry => ({
        ...entry,
        commitment_groups: entry.commitment_group_id ? { name: groupsMap.get(entry.commitment_group_id) } : null,
        commitments: entry.commitment_id ? { name: commitmentsMap.get(entry.commitment_id) } : null,
        commitment_types: entry.commitment_type_id ? { name: typesMap.get(entry.commitment_type_id) } : null,
      }));

      setFutureEntries(enrichedEntries);
    } catch (error) {
      console.error('Error loading future entries:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os lançamentos futuros",
        variant: "destructive",
      });
    }
  };


  const combinedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    // Coletar todas as datas únicas
    const allDates = new Set<string>();
    filteredData.forEach(b =>
      b.days.forEach(d => allDates.add(d.date))
    );
    const orderedDates = Array.from(allDates).sort(); // yyyy-MM-dd já ordena lexicograficamente

    // Indexar por banco+data pra pegar abertura do primeiro dia
    const dayByBankDate = new Map<string, DailyCashFlow>();
    filteredData.forEach(b => {
      b.days.forEach(d => {
        dayByBankDate.set(`${b.bank.id}__${d.date}`, d);
      });
    });

    // Abertura inicial: soma das aberturas do primeiro dia (se existir em cada banco)
    const firstDate = orderedDates[0];
    let runningBalance = filteredData.reduce((sum, b) => {
      const d = dayByBankDate.get(`${b.bank.id}__${firstDate}`);
      return sum + (d?.opening ?? 0);
    }, 0);

    const combinedDays: DailyCashFlow[] = [];

    orderedDates.forEach(date => {
      // Agregar por data
      let historicalIn = 0;
      let historicalOut = 0;
      let projectedIn = 0;
      let projectedOut = 0;
      const items: CashFlowItem[] = [];

      filteredData.forEach(b => {
        const d = dayByBankDate.get(`${b.bank.id}__${date}`);
        if (!d) return;
        historicalIn += d.historicalIn;
        historicalOut += d.historicalOut;
        projectedIn += d.projectedIn;
        projectedOut += d.projectedOut;
        if (d.items?.length) items.push(...d.items);
      });

      const opening = runningBalance;
      const closing = opening + historicalIn - historicalOut + projectedIn - projectedOut;

      combinedDays.push({
        day: Number(date.split("-")[2]),
        date,
        opening,
        historicalIn,
        historicalOut,
        projectedIn,
        projectedOut,
        closing,
        items: items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      });

      runningBalance = closing;
    });

    // Totais do consolidado
    const totalHistoricalIn = combinedDays.reduce((s, d) => s + d.historicalIn, 0);
    const totalHistoricalOut = combinedDays.reduce((s, d) => s + d.historicalOut, 0);
    const totalProjectedIn = combinedDays.reduce((s, d) => s + d.projectedIn, 0);
    const totalProjectedOut = combinedDays.reduce((s, d) => s + d.projectedOut, 0);

    // Abertura total do primeiro dia já calculada em runningBalance inicial (antes do loop)
    const totalOpening = combinedDays[0]?.opening ?? 0;
    const totalClosing = combinedDays[combinedDays.length - 1]?.closing ?? 0;

    const combinedBank: BankCashFlow = {
      bank: { id: "all", bank_name: "Consolidado (todos os bancos)", account_number: "" },
      days: combinedDays,
      totalOpening,
      totalHistoricalIn,
      totalHistoricalOut,
      totalProjectedIn,
      totalProjectedOut,
      totalClosing,
    };

    return combinedBank;
  }, [filteredData]);


  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    form.reset({
      description: entry.description,
      amount: entry.amount.toString(),
      due_date: entry.due_date,
      entry_type: entry.entry_type,
      commitment_group_id: entry.commitment_group_id || "",
      commitment_id: entry.commitment_id || "",
      commitment_type_id: entry.commitment_type_id || "",
      notes: entry.notes || "",
    });
    setModalOpen(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      if (!companyId) return;
      
      const { error } = await supabase
        .from('future_entries')
        .delete()
        .eq('id', entryId)
        .eq('company_id', companyId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Lançamento excluído com sucesso",
      });

      loadFutureEntries();
      loadCashFlowData();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lançamento",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: FutureEntryForm) => {
    setModalLoading(true);
    try {
      const entryData = {
        description: data.description,
        amount: Number(data.amount),
        due_date: data.due_date,
        entry_type: data.entry_type,
        commitment_group_id: data.commitment_group_id && data.commitment_group_id !== 'none' ? data.commitment_group_id : null,
        commitment_id: data.commitment_id && data.commitment_id !== 'none' ? data.commitment_id : null,
        commitment_type_id: data.commitment_type_id && data.commitment_type_id !== 'none' ? data.commitment_type_id : null,
        notes: data.notes || null,
        company_id: companyId,
      };

      let error;
      if (editingEntry) {
        const { error: updateError } = await supabase
          .from('future_entries')
          .update(entryData)
          .eq('id', editingEntry.id)
          .eq('company_id', companyId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('future_entries')
          .insert([entryData]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: editingEntry ? "Lançamento atualizado com sucesso" : "Lançamento criado com sucesso",
      });

      setModalOpen(false);
      setEditingEntry(null);
      form.reset();
      loadCashFlowData();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o lançamento",
        variant: "destructive",
      });
    } finally {
      setModalLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'historical':
        return <ArrowUpDown className="h-4 w-4" />;
      case 'receivable':
        return <Receipt className="h-4 w-4 text-green-600" />;
      case 'payable':
        return <CreditCard className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'historical':
        return 'Realizado';
      case 'receivable':
        return 'A Receber';
      case 'payable':
        return 'A Pagar';
      default:
        return 'Outros';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const exportToExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados disponíveis para exportar",
        variant: "destructive",
      });
      return;
    }

    // Preparar dados da tabela principal por banco
    const mainTableData = [];

    filteredData.forEach((bankData, bankIndex) => {
      // Header do banco
      mainTableData.push([`BANCO: ${bankData.bank.bank_name} - ${bankData.bank.account_number}`]);

      // Header da tabela
      const headerRow = ['Tipo', ...bankData.days.map(day => `${day.day}/${day.date.split('-')[1]}`), 'Total'];
      mainTableData.push(headerRow);

      // Linhas de dados
      const entradasRow = ['Entradas', ...bankData.days.map(day => day.historicalIn || 0), bankData.totalHistoricalIn];
      mainTableData.push(entradasRow);

      const saidasRow = ['Saídas', ...bankData.days.map(day => day.historicalOut || 0), bankData.totalHistoricalOut];
      mainTableData.push(saidasRow);

      const receberRow = ['A Receber', ...bankData.days.map(day => day.projectedIn || 0), bankData.totalProjectedIn];
      mainTableData.push(receberRow);

      const pagarRow = ['A Pagar', ...bankData.days.map(day => day.projectedOut || 0), bankData.totalProjectedOut];
      mainTableData.push(pagarRow);

      const saldoRow = ['Saldo', ...bankData.days.map(day => day.closing || 0), bankData.days[bankData.days.length - 1]?.closing || 0];
      mainTableData.push(saldoRow);

      // Linha em branco entre bancos
      if (bankIndex < filteredData.length - 1) {
        mainTableData.push(['']);
      }
    });

    // Criar workbook
    const wb = XLSX.utils.book_new();

    // Criar worksheet principal
    const wsMain = XLSX.utils.aoa_to_sheet(mainTableData);
    XLSX.utils.book_append_sheet(wb, wsMain, 'Fluxo de Caixa');

    // Gerar nome do arquivo
    const monthName = selectedMonths.length > 0
      ? format(parseISO(selectedMonths[0] + '-01'), 'MMMM-yyyy', { locale: ptBR })
      : format(new Date(), 'MMMM-yyyy', { locale: ptBR });

    const fileName = `fluxo-caixa-${monthName}.xlsx`;

    // Salvar arquivo
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Sucesso",
      description: "Arquivo Excel exportado com sucesso",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={!filteredData || filteredData.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>

          <Dialog open={modalOpen} onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) {
              setEditingEntry(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Lançamento
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? 'Editar Lançamento' : 'Novo Lançamento Futuro'}
                </DialogTitle>
                <DialogDescription>
                  {editingEntry ? 'Edite os dados do lançamento' : 'Adicione um novo lançamento futuro (conta a pagar ou a receber)'}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 pr-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite a descrição" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Vencimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="entry_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="receivable">A Receber</SelectItem>
                            <SelectItem value="payable">A Pagar</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="commitment_group_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupo de Natureza (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um grupo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {commitmentGroups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="commitment_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Natureza (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma natureza" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {filteredCommitments.map((commitment) => (
                              <SelectItem key={commitment.id} value={commitment.id}>
                                {commitment.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="commitment_type_id"
                    render={({ field }) => {
                      const selectedCommitment = commitments.find(c => c.id === form.watch("commitment_id"));
                      const commitmentType = commitmentTypes.find(t => t.id === selectedCommitment?.commitment_type_id);

                      return (
                        <FormItem>
                          <FormLabel>Tipo de Natureza (Automático)</FormLabel>
                          <FormControl>
                            <Input
                              value={commitmentType?.name || "Nenhum tipo definido"}
                              disabled
                              className="bg-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Digite observações adicionais" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingEntry(null);
                    form.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={form.handleSubmit(onSubmit)} disabled={modalLoading}>
                  {modalLoading ? "Salvando..." : editingEntry ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() => {
              loadFutureEntries();
              setManageModalOpen(true);
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Verificar Lançamentos
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecione os meses e intervalo de dias para visualizar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Dia início:</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={dayRange.start}
                  onChange={(e) => setDayRange(prev => ({ ...prev, start: Number(e.target.value) }))}
                  className="w-20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>Dia fim:</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={dayRange.end}
                  onChange={(e) => setDayRange(prev => ({ ...prev, end: Number(e.target.value) }))}
                  className="w-20"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Meses:</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    selectedMonths.length === 0
                      ? "Selecione os meses"
                      : selectedMonths.length === availableMonths.length
                      ? "Todos os meses selecionados"
                      : `${selectedMonths.length} mês(es) selecionado(s)`
                  } />
                </SelectTrigger>
                <SelectContent>
                  {/* Opção "Selecionar todos os meses" */}
                  <div className="flex items-center space-x-2 px-2 py-1 hover:bg-accent cursor-pointer border-b mb-1"
                    onClick={(e) => {
                      e.preventDefault();
                      if (selectedMonths.length === availableMonths.length) {
                        setSelectedMonths([]);
                      } else {
                        setSelectedMonths(availableMonths);
                        if (availableMonths.length > 0) {
                          loadCashFlowData(); // Carrega dados quando todos os meses são selecionados
                        }
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedMonths.length === availableMonths.length && availableMonths.length > 0}
                      onCheckedChange={() => { }} // Disabled porque o click é tratado pelo div pai
                    />
                    <Label className="text-sm cursor-pointer font-medium">
                      Selecionar todos os meses
                    </Label>
                  </div>
                  {availableMonths.map((month) => (
                    <div key={month} className="flex items-center space-x-2 px-2 py-1 hover:bg-accent cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        if (selectedMonths.includes(month)) {
                          setSelectedMonths(prev => prev.filter(m => m !== month));
                        } else {
                          setSelectedMonths(prev => [...prev, month]);
                          // Carrega dados na primeira seleção de mês
                          if (monthlyData.length === 0) {
                            loadCashFlowData();
                          }
                        }
                      }}
                    >
                      <Checkbox
                        checked={selectedMonths.includes(month)}
                        onCheckedChange={() => { }} // Disabled because click is handled by parent div
                      />
                      <Label className="text-sm cursor-pointer">
                        {format(parseISO(month + '-01'), 'MMMM yyyy', { locale: ptBR })}
                      </Label>
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox 
                id="show-empty-accounts"
                checked={showEmptyAccounts}
                onCheckedChange={(checked) => setShowEmptyAccounts(checked as boolean)}
              />
              <Label htmlFor="show-empty-accounts" className="text-sm cursor-pointer">
                Mostrar contas sem movimentação
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fluxo de Caixa por Banco */}
      <div className="space-y-4">
        {selectedMonths.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione um mês</h3>
              <p className="text-gray-500">Selecione pelo menos um mês nos filtros acima para visualizar o fluxo de caixa.</p>
            </CardContent>
          </Card>
        ) : filteredData.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {loading ? "Carregando dados..." : "Nenhum dado encontrado"}
              </h3>
              <p className="text-gray-500">
                {loading ? "Aguarde enquanto carregamos os dados do fluxo de caixa." : "Não há dados de fluxo de caixa para o período selecionado."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredData.map((bankData) => (
            <Card key={bankData.bank.id}>
              <Collapsible
                open={expandedBanks[bankData.bank.id]}
                onOpenChange={() => toggleBankExpansion(bankData.bank.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{bankData.bank.bank_name}</CardTitle>
                          <CardDescription>Conta: {bankData.bank.account_number}</CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Saldo Final</div>
                          <div className="text-lg font-bold text-primary">
                            {formatCurrency(bankData.totalClosing)}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-green-600">
                            +{formatCurrency(bankData.totalHistoricalIn + bankData.totalProjectedIn)}
                          </Badge>
                          <Badge variant="outline" className="text-red-600">
                            -{formatCurrency(bankData.totalHistoricalOut + bankData.totalProjectedOut)}
                          </Badge>
                        </div>

                        {expandedBanks[bankData.bank.id] ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent>
                    {bankData.days.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Nenhuma movimentação encontrada para este banco no período selecionado.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-200">
                          <thead>
                            <tr>
                              <th className="border border-gray-200 p-2 bg-muted text-left font-medium">Tipo</th>
                              {bankData.days.map((day) => (
                                <th key={`${day.date}-${day.day}`} className="border border-gray-200 p-2 bg-muted text-center font-medium min-w-[80px]">
                                  {day.day}/{day.date.split('-')[1]}
                                </th>
                              ))}
                              <th className="border border-gray-200 p-2 bg-muted text-center font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Entradas Realizadas */}
                            <tr>
                              <td className="border border-gray-200 p-2 font-medium text-green-600">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4" />
                                  Entradas
                                </div>
                              </td>
                              {bankData.days.map((day) => {
                                const cellId = `${bankData.bank.id}-entry-${day.date}`;
                                const hasItems = day.historicalIn > 0;
                                return (
                                  <td key={`entry-${day.date}-${day.day}`} className="border border-gray-200 p-1 text-center">
                                    {hasItems ? (
                                      <button
                                        onClick={() => toggleCellDetails(cellId)}
                                        className="text-green-600 text-sm font-medium hover:underline cursor-pointer"
                                      >
                                        {formatCurrency(day.historicalIn)}
                                      </button>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border border-gray-200 p-2 text-center font-medium text-green-600">
                                {formatCurrency(bankData.totalHistoricalIn)}
                              </td>
                            </tr>

                            {/* Detalhes das Entradas - mostrar apenas se alguma célula estiver expandida */}
                            {bankData.days.some(day => {
                              const cellId = `${bankData.bank.id}-entry-${day.date}`;
                              return expandedCells[cellId] && day.historicalIn > 0;
                            }) && (
                                <tr>
                                  <td colSpan={bankData.days.length + 2} className="border border-gray-200 p-0">
                                    <div className="bg-green-50 p-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {bankData.days.map((day) => {
                                          const cellId = `${bankData.bank.id}-entry-${day.date}`;
                                          if (!expandedCells[cellId] || day.historicalIn === 0) return null;

                                          const items = getCellItems(day, 'historicalIn');
                                          return (
                                            <div key={`detail-entry-${day.date}`} className="bg-white p-3 rounded border">
                                              <h4 className="font-medium text-green-600 mb-2">
                                                Entradas - {day.day}/{day.date.split('-')[1]}
                                              </h4>
                                              <div className="space-y-2">
                                                {items.map((item, idx) => (
                                                  <div key={idx} className="text-sm">
                                                    <div className="font-medium">{item.description}</div>
                                                    <div className="text-green-600 font-medium">
                                                      {formatCurrency(Math.abs(item.amount))}
                                                    </div>
                                                    {item.classification?.group && (
                                                      <div className="text-xs text-gray-500">
                                                        {item.classification.group}
                                                        {item.classification.commitment && ` - ${item.classification.commitment}`}
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}

                            {/* Saídas Realizadas */}
                            <tr>
                              <td className="border border-gray-200 p-2 font-medium text-red-600">
                                <div className="flex items-center gap-2">
                                  <TrendingDown className="h-4 w-4" />
                                  Saídas
                                </div>
                              </td>
                              {bankData.days.map((day) => {
                                const cellId = `${bankData.bank.id}-exit-${day.date}`;
                                const hasItems = day.historicalOut > 0;
                                return (
                                  <td key={`exit-${day.date}-${day.day}`} className="border border-gray-200 p-1 text-center">
                                    {hasItems ? (
                                      <button
                                        onClick={() => toggleCellDetails(cellId)}
                                        className="text-red-600 text-sm font-medium hover:underline cursor-pointer"
                                      >
                                        {formatCurrency(day.historicalOut)}
                                      </button>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border border-gray-200 p-2 text-center font-medium text-red-600">
                                {formatCurrency(bankData.totalHistoricalOut)}
                              </td>
                            </tr>

                            {/* Detalhes das Saídas */}
                            {bankData.days.some(day => {
                              const cellId = `${bankData.bank.id}-exit-${day.date}`;
                              return expandedCells[cellId] && day.historicalOut > 0;
                            }) && (
                                <tr>
                                  <td colSpan={bankData.days.length + 2} className="border border-gray-200 p-0">
                                    <div className="bg-red-50 p-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {bankData.days.map((day) => {
                                          const cellId = `${bankData.bank.id}-exit-${day.date}`;
                                          if (!expandedCells[cellId] || day.historicalOut === 0) return null;

                                          const items = getCellItems(day, 'historicalOut');
                                          return (
                                            <div key={`detail-exit-${day.date}`} className="bg-white p-3 rounded border">
                                              <h4 className="font-medium text-red-600 mb-2">
                                                Saídas - {day.day}/{day.date.split('-')[1]}
                                              </h4>
                                              <div className="space-y-2">
                                                {items.map((item, idx) => (
                                                  <div key={idx} className="text-sm">
                                                    <div className="font-medium">{item.description}</div>
                                                    <div className="text-red-600 font-medium">
                                                      {formatCurrency(Math.abs(item.amount))}
                                                    </div>
                                                    {item.classification?.group && (
                                                      <div className="text-xs text-gray-500">
                                                        {item.classification.group}
                                                        {item.classification.commitment && ` - ${item.classification.commitment}`}
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}

                            {/* Entradas Projetadas */}
                            <tr>
                              <td className="border border-gray-200 p-2 font-medium text-green-500">
                                <div className="flex items-center gap-2">
                                  <Receipt className="h-4 w-4" />
                                  A Receber
                                </div>
                              </td>
                              {bankData.days.map((day) => {
                                const cellId = `${bankData.bank.id}-receivable-${day.date}`;
                                const hasItems = day.projectedIn > 0;
                                return (
                                  <td key={`proj-in-${day.date}-${day.day}`} className="border border-gray-200 p-1 text-center">
                                    {hasItems ? (
                                      <button
                                        onClick={() => toggleCellDetails(cellId)}
                                        className="text-green-500 text-sm font-medium hover:underline cursor-pointer"
                                      >
                                        {formatCurrency(day.projectedIn)}
                                      </button>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border border-gray-200 p-2 text-center font-medium text-green-500">
                                {formatCurrency(bankData.totalProjectedIn)}
                              </td>
                            </tr>

                            {/* Detalhes A Receber */}
                            {bankData.days.some(day => {
                              const cellId = `${bankData.bank.id}-receivable-${day.date}`;
                              return expandedCells[cellId] && day.projectedIn > 0;
                            }) && (
                                <tr>
                                  <td colSpan={bankData.days.length + 2} className="border border-gray-200 p-0">
                                    <div className="bg-green-50 p-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {bankData.days.map((day) => {
                                          const cellId = `${bankData.bank.id}-receivable-${day.date}`;
                                          if (!expandedCells[cellId] || day.projectedIn === 0) return null;

                                          const items = getCellItems(day, 'projectedIn');
                                          return (
                                            <div key={`detail-receivable-${day.date}`} className="bg-white p-3 rounded border">
                                              <h4 className="font-medium text-green-500 mb-2">
                                                A Receber - {day.day}/{day.date.split('-')[1]}
                                              </h4>
                                              <div className="space-y-2">
                                                {items.map((item, idx) => (
                                                  <div key={idx} className="text-sm">
                                                    <div className="font-medium">{item.description}</div>
                                                    <div className="text-green-500 font-medium">
                                                      {formatCurrency(item.amount)}
                                                    </div>
                                                    {item.classification?.group && (
                                                      <div className="text-xs text-gray-500">
                                                        {item.classification.group}
                                                        {item.classification.commitment && ` - ${item.classification.commitment}`}
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}

                            {/* Saídas Projetadas */}
                            <tr>
                              <td className="border border-gray-200 p-2 font-medium text-red-500">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  A Pagar
                                </div>
                              </td>
                              {bankData.days.map((day) => {
                                const cellId = `${bankData.bank.id}-payable-${day.date}`;
                                const hasItems = day.projectedOut > 0;
                                return (
                                  <td key={`proj-out-${day.date}-${day.day}`} className="border border-gray-200 p-1 text-center">
                                    {hasItems ? (
                                      <button
                                        onClick={() => toggleCellDetails(cellId)}
                                        className="text-red-500 text-sm font-medium hover:underline cursor-pointer"
                                      >
                                        {formatCurrency(day.projectedOut)}
                                      </button>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border border-gray-200 p-2 text-center font-medium text-red-500">
                                {formatCurrency(bankData.totalProjectedOut)}
                              </td>
                            </tr>

                            {/* Detalhes A Pagar */}
                            {bankData.days.some(day => {
                              const cellId = `${bankData.bank.id}-payable-${day.date}`;
                              return expandedCells[cellId] && day.projectedOut > 0;
                            }) && (
                                <tr>
                                  <td colSpan={bankData.days.length + 2} className="border border-gray-200 p-0">
                                    <div className="bg-red-50 p-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {bankData.days.map((day) => {
                                          const cellId = `${bankData.bank.id}-payable-${day.date}`;
                                          if (!expandedCells[cellId] || day.projectedOut === 0) return null;

                                          const items = getCellItems(day, 'projectedOut');
                                          return (
                                            <div key={`detail-payable-${day.date}`} className="bg-white p-3 rounded border">
                                              <h4 className="font-medium text-red-500 mb-2">
                                                A Pagar - {day.day}/{day.date.split('-')[1]}
                                              </h4>
                                              <div className="space-y-2">
                                                {items.map((item, idx) => (
                                                  <div key={idx} className="text-sm">
                                                    <div className="font-medium">{item.description}</div>
                                                    <div className="text-red-500 font-medium">
                                                      {formatCurrency(item.amount)}
                                                    </div>
                                                    {item.classification?.group && (
                                                      <div className="text-xs text-gray-500">
                                                        {item.classification.group}
                                                        {item.classification.commitment && ` - ${item.classification.commitment}`}
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}

                            {/* Linha de Saldo */}
                            <tr className="bg-blue-50">
                              <td className="border border-gray-200 p-2 font-bold text-blue-600">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  Saldo
                                </div>
                              </td>
                              {bankData.days.map((day) => (
                                <td key={`balance-${day.date}-${day.day}`} className="border border-gray-200 p-1 text-center bg-blue-50">
                                  <span className={`text-sm font-bold ${day.closing >= 0 ? 'text-blue-600' : 'text-red-600'
                                    }`}>
                                    {formatCurrency(day.closing)}
                                  </span>
                                </td>
                              ))}
                              <td className="border border-gray-200 p-2 text-center font-bold text-blue-600 bg-blue-50">
                                {formatCurrency(bankData.days[bankData.days.length - 1]?.closing || 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}

        {/* Consolidado: todos os bancos juntos */}
        {selectedMonths.length > 0 && combinedData && combinedData.days.length > 0 && (
          <Card>
            <Collapsible
              open={expandedBanks[combinedData.bank.id]}
              onOpenChange={() => toggleBankExpansion(combinedData.bank.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{combinedData.bank.bank_name}</CardTitle>
                        <CardDescription>Visão unificada sem separação por banco</CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Saldo Final</div>
                        <div className="text-lg font-bold text-primary">
                          {formatCurrency(combinedData.totalClosing)}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-green-600">
                          +{formatCurrency(combinedData.totalHistoricalIn + combinedData.totalProjectedIn)}
                        </Badge>
                        <Badge variant="outline" className="text-red-600">
                          -{formatCurrency(combinedData.totalHistoricalOut + combinedData.totalProjectedOut)}
                        </Badge>
                      </div>

                      {expandedBanks[combinedData.bank.id] ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr>
                          <th className="border border-gray-200 p-2 bg-muted text-left font-medium">Tipo</th>
                          {combinedData.days.map((day) => (
                            <th key={`all-${day.date}-${day.day}`} className="border border-gray-200 p-2 bg-muted text-center font-medium min-w-[80px]">
                              {day.day}/{day.date.split('-')[1]}
                            </th>
                          ))}
                          <th className="border border-gray-200 p-2 bg-muted text-center font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Entradas Realizadas */}
                        <tr>
                          <td className="border border-gray-200 p-2 font-medium text-green-600">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Entradas
                            </div>
                          </td>
                          {combinedData.days.map((day) => {
                            const cellId = `${combinedData.bank.id}-entry-${day.date}`;
                            const hasItems = day.historicalIn > 0;
                            return (
                              <td key={`all-entry-${day.date}-${day.day}`} className="border border-gray-200 p-1 text-center">
                                {hasItems ? (
                                  <button
                                    onClick={() => toggleCellDetails(cellId)}
                                    className="text-green-600 text-sm font-medium hover:underline cursor-pointer"
                                  >
                                    {formatCurrency(day.historicalIn)}
                                  </button>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="border border-gray-200 p-2 text-center font-medium text-green-600">
                            {formatCurrency(combinedData.totalHistoricalIn)}
                          </td>
                        </tr>

                        {/* Detalhes Entradas */}
                        {combinedData.days.some(day => {
                          const cellId = `${combinedData.bank.id}-entry-${day.date}`;
                          return expandedCells[cellId] && day.historicalIn > 0;
                        }) && (
                            <tr>
                              <td colSpan={combinedData.days.length + 2} className="border border-gray-200 p-0">
                                <div className="bg-green-50 p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {combinedData.days.map((day) => {
                                      const cellId = `${combinedData.bank.id}-entry-${day.date}`;
                                      if (!expandedCells[cellId] || day.historicalIn === 0) return null;
                                      const items = getCellItems(day, 'historicalIn');
                                      return (
                                        <div key={`all-detail-entry-${day.date}`} className="bg-white p-3 rounded border">
                                          <h4 className="font-medium text-green-600 mb-2">
                                            Entradas - {day.day}/{day.date.split('-')[1]}
                                          </h4>
                                          <div className="space-y-2">
                                            {items.map((item, idx) => (
                                              <div key={idx} className="text-sm">
                                                <div className="font-medium">{item.description}</div>
                                                <div className="text-green-600 font-medium">
                                                  {formatCurrency(Math.abs(item.amount))}
                                                </div>
                                                {item.classification?.group && (
                                                  <div className="text-xs text-gray-500">
                                                    {item.classification.group}
                                                    {item.classification.commitment && ` - ${item.classification.commitment}`}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                        {/* Saídas Realizadas */}
                        <tr>
                          <td className="border border-gray-200 p-2 font-medium text-red-600">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4" />
                              Saídas
                            </div>
                          </td>
                          {combinedData.days.map((day) => {
                            const cellId = `${combinedData.bank.id}-exit-${day.date}`;
                            const hasItems = day.historicalOut > 0;
                            return (
                              <td key={`all-exit-${day.date}-${day.day}`} className="border border-gray-200 p-1 text-center">
                                {hasItems ? (
                                  <button
                                    onClick={() => toggleCellDetails(cellId)}
                                    className="text-red-600 text-sm font-medium hover:underline cursor-pointer"
                                  >
                                    {formatCurrency(day.historicalOut)}
                                  </button>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="border border-gray-200 p-2 text-center font-medium text-red-600">
                            {formatCurrency(combinedData.totalHistoricalOut)}
                          </td>
                        </tr>

                        {/* Detalhes Saídas */}
                        {combinedData.days.some(day => {
                          const cellId = `${combinedData.bank.id}-exit-${day.date}`;
                          return expandedCells[cellId] && day.historicalOut > 0;
                        }) && (
                            <tr>
                              <td colSpan={combinedData.days.length + 2} className="border border-gray-200 p-0">
                                <div className="bg-red-50 p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {combinedData.days.map((day) => {
                                      const cellId = `${combinedData.bank.id}-exit-${day.date}`;
                                      if (!expandedCells[cellId] || day.historicalOut === 0) return null;
                                      const items = getCellItems(day, 'historicalOut');
                                      return (
                                        <div key={`all-detail-exit-${day.date}`} className="bg-white p-3 rounded border">
                                          <h4 className="font-medium text-red-600 mb-2">
                                            Saídas - {day.day}/{day.date.split('-')[1]}
                                          </h4>
                                          <div className="space-y-2">
                                            {items.map((item, idx) => (
                                              <div key={idx} className="text-sm">
                                                <div className="font-medium">{item.description}</div>
                                                <div className="text-red-600 font-medium">
                                                  {formatCurrency(Math.abs(item.amount))}
                                                </div>
                                                {item.classification?.group && (
                                                  <div className="text-xs text-gray-500">
                                                    {item.classification.group}
                                                    {item.classification.commitment && ` - ${item.classification.commitment}`}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                        {/* A Receber */}
                        <tr>
                          <td className="border border-gray-200 p-2 font-medium text-green-500">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4" />
                              A Receber
                            </div>
                          </td>
                          {combinedData.days.map((day) => {
                            const cellId = `${combinedData.bank.id}-receivable-${day.date}`;
                            const hasItems = day.projectedIn > 0;
                            return (
                              <td key={`all-proj-in-${day.date}-${day.day}`} className="border border-gray-200 p-1 text-center">
                                {hasItems ? (
                                  <button
                                    onClick={() => toggleCellDetails(cellId)}
                                    className="text-green-500 text-sm font-medium hover:underline cursor-pointer"
                                  >
                                    {formatCurrency(day.projectedIn)}
                                  </button>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="border border-gray-200 p-2 text-center font-medium text-green-500">
                            {formatCurrency(combinedData.totalProjectedIn)}
                          </td>
                        </tr>

                        {/* Detalhes A Receber */}
                        {combinedData.days.some(day => {
                          const cellId = `${combinedData.bank.id}-receivable-${day.date}`;
                          return expandedCells[cellId] && day.projectedIn > 0;
                        }) && (
                            <tr>
                              <td colSpan={combinedData.days.length + 2} className="border border-gray-200 p-0">
                                <div className="bg-green-50 p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {combinedData.days.map((day) => {
                                      const cellId = `${combinedData.bank.id}-receivable-${day.date}`;
                                      if (!expandedCells[cellId] || day.projectedIn === 0) return null;
                                      const items = getCellItems(day, 'projectedIn');
                                      return (
                                        <div key={`all-detail-receivable-${day.date}`} className="bg-white p-3 rounded border">
                                          <h4 className="font-medium text-green-500 mb-2">
                                            A Receber - {day.day}/{day.date.split('-')[1]}
                                          </h4>
                                          <div className="space-y-2">
                                            {items.map((item, idx) => (
                                              <div key={idx} className="text-sm">
                                                <div className="font-medium">{item.description}</div>
                                                <div className="text-green-500 font-medium">
                                                  {formatCurrency(item.amount)}
                                                </div>
                                                {item.classification?.group && (
                                                  <div className="text-xs text-gray-500">
                                                    {item.classification.group}
                                                    {item.classification.commitment && ` - ${item.classification.commitment}`}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                        {/* A Pagar */}
                        <tr>
                          <td className="border border-gray-200 p-2 font-medium text-red-500">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              A Pagar
                            </div>
                          </td>
                          {combinedData.days.map((day) => {
                            const cellId = `${combinedData.bank.id}-payable-${day.date}`;
                            const hasItems = day.projectedOut > 0;
                            return (
                              <td key={`all-proj-out-${day.date}-${day.day}`} className="border border-gray-200 p-1 text-center">
                                {hasItems ? (
                                  <button
                                    onClick={() => toggleCellDetails(cellId)}
                                    className="text-red-500 text-sm font-medium hover:underline cursor-pointer"
                                  >
                                    {formatCurrency(day.projectedOut)}
                                  </button>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="border border-gray-200 p-2 text-center font-medium text-red-500">
                            {formatCurrency(combinedData.totalProjectedOut)}
                          </td>
                        </tr>

                        {/* Detalhes A Pagar */}
                        {combinedData.days.some(day => {
                          const cellId = `${combinedData.bank.id}-payable-${day.date}`;
                          return expandedCells[cellId] && day.projectedOut > 0;
                        }) && (
                            <tr>
                              <td colSpan={combinedData.days.length + 2} className="border border-gray-200 p-0">
                                <div className="bg-red-50 p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {combinedData.days.map((day) => {
                                      const cellId = `${combinedData.bank.id}-payable-${day.date}`;
                                      if (!expandedCells[cellId] || day.projectedOut === 0) return null;
                                      const items = getCellItems(day, 'projectedOut');
                                      return (
                                        <div key={`all-detail-payable-${day.date}`} className="bg-white p-3 rounded border">
                                          <h4 className="font-medium text-red-500 mb-2">
                                            A Pagar - {day.day}/{day.date.split('-')[1]}
                                          </h4>
                                          <div className="space-y-2">
                                            {items.map((item, idx) => (
                                              <div key={idx} className="text-sm">
                                                <div className="font-medium">{item.description}</div>
                                                <div className="text-red-500 font-medium">
                                                  {formatCurrency(item.amount)}
                                                </div>
                                                {item.classification?.group && (
                                                  <div className="text-xs text-gray-500">
                                                    {item.classification.group}
                                                    {item.classification.commitment && ` - ${item.classification.commitment}`}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                        {/* Saldo */}
                        <tr className="bg-blue-50">
                          <td className="border border-gray-200 p-2 font-bold text-blue-600">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Saldo
                            </div>
                          </td>
                          {combinedData.days.map((day) => (
                            <td key={`all-balance-${day.date}-${day.day}`} className="border border-gray-200 p-1 text-center bg-blue-50">
                              <span className={`text-sm font-bold ${day.closing >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(day.closing)}
                              </span>
                            </td>
                          ))}
                          <td className="border border-gray-200 p-2 text-center font-bold text-blue-600 bg-blue-50">
                            {formatCurrency(combinedData.days[combinedData.days.length - 1]?.closing || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

      </div>

      {/* Manage Future Entries Modal */}
      <Dialog open={manageModalOpen} onOpenChange={setManageModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Lançamentos Futuros</DialogTitle>
            <DialogDescription>
              Visualize e gerencie todos os lançamentos futuros
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filtros */}
            <div className="space-y-3">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="filter-description">Pesquisar</Label>
                  <Input
                    id="filter-description"
                    placeholder="Buscar por descrição..."
                    value={filterDescription}
                    onChange={(e) => setFilterDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="filter-type">Tipo</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger id="filter-type">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="receivable">A Receber</SelectItem>
                      <SelectItem value="payable">A Pagar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filter-status">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="filter-status">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="received">Recebido</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filter-group">Grupo</Label>
                  <Select value={filterGroup} onValueChange={setFilterGroup}>
                    <SelectTrigger id="filter-group">
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {commitmentGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {futureEntries.filter(entry => {
              const matchesDescription = filterDescription === "" || 
                entry.description.toLowerCase().includes(filterDescription.toLowerCase());
              const matchesType = filterType === "all" || entry.entry_type === filterType;
              const matchesStatus = filterStatus === "all" || entry.status === filterStatus;
              const matchesGroup = filterGroup === "all" || entry.commitment_group_id === filterGroup;
              return matchesDescription && matchesType && matchesStatus && matchesGroup;
            }).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum lançamento futuro encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-gray-200 p-2 text-left">Data</th>
                      <th className="border border-gray-200 p-2 text-left">Descrição</th>
                      <th className="border border-gray-200 p-2 text-left">Valor</th>
                      <th className="border border-gray-200 p-2 text-left">Tipo</th>
                      <th className="border border-gray-200 p-2 text-left">Status</th>
                      <th className="border border-gray-200 p-2 text-left">Grupo</th>
                      <th className="border border-gray-200 p-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {futureEntries
                      .filter(entry => {
                        const matchesDescription = filterDescription === "" || 
                          entry.description.toLowerCase().includes(filterDescription.toLowerCase());
                        const matchesType = filterType === "all" || entry.entry_type === filterType;
                        const matchesStatus = filterStatus === "all" || entry.status === filterStatus;
                        const matchesGroup = filterGroup === "all" || entry.commitment_group_id === filterGroup;
                        return matchesDescription && matchesType && matchesStatus && matchesGroup;
                      })
                      .map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 p-2">
                          {format(parseISO(entry.due_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="border border-gray-200 p-2">{entry.description}</td>
                        <td className="border border-gray-200 p-2">
                          <span className={entry.entry_type === 'receivable' ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(entry.amount)}
                          </span>
                        </td>
                        <td className="border border-gray-200 p-2">
                          <Badge variant={entry.entry_type === 'receivable' ? 'default' : 'secondary'}>
                            {getTypeLabel(entry.entry_type)}
                          </Badge>
                        </td>
                        <td className="border border-gray-200 p-2">
                          <Badge variant="outline">{entry.status}</Badge>
                        </td>
                        <td className="border border-gray-200 p-2">
                          {entry.commitment_groups?.name || '-'}
                        </td>
                        <td className="border border-gray-200 p-2 text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditEntry(entry)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
                                  handleDeleteEntry(entry.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
