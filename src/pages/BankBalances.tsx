import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  RefreshCw,
  Eye,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';

interface BankBalance {
  id: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_type: string;
  agency?: string;
  current_balance: number;
  last_transaction_date: string | null;
  transactions_count: number;
  credit_total: number;
  debit_total: number;
}

interface GroupedBank {
  bank_name: string;
  bank_code: string;
  accounts: BankBalance[];
  total_balance: number;
  total_credit: number;
  total_debit: number;
  total_transactions: number;
}

const BankBalances = () => {
  const { companyId } = useAuth();
  const [bankBalances, setBankBalances] = useState<BankBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<string>('all'); // 'all', 'month-ofx', 'month-future'
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (companyId) {
      fetchAvailableMonths();
      fetchBankBalances();
    }
  }, [companyId]);

  useEffect(() => {
    if (filterPeriod !== 'all' && selectedMonth) {
      fetchBankBalances();
    } else if (filterPeriod === 'all') {
      fetchBankBalances();
    }
  }, [filterPeriod, selectedMonth]);

  const fetchAvailableMonths = async () => {
    try {
      if (!companyId) return;

      // Get months from transactions (OFX)
      const { data: transactionMonths } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('company_id', companyId);

      // Get months from future entries
      const { data: futureMonths } = await supabase
        .from('future_entries')
        .select('due_date')
        .eq('company_id', companyId);

      const months = new Set<string>();
      
      transactionMonths?.forEach(t => {
        const date = new Date(t.transaction_date);
        const monthKey = format(date, 'yyyy-MM');
        months.add(monthKey);
      });

      futureMonths?.forEach(f => {
        const date = new Date(f.due_date);
        const monthKey = format(date, 'yyyy-MM');
        months.add(monthKey);
      });

      setAvailableMonths(Array.from(months).sort().reverse());
    } catch (error) {
      console.error('Error fetching available months:', error);
    }
  };

  const fetchBankBalances = async () => {
    try {
      setLoading(true);

      if (!companyId) {
        setBankBalances([]);
        return;
      }

      // Fetch banks with calculated balances
      const { data: banksData, error: banksError } = await supabase
        .from('banks')
        .select(`
          id,
          bank_name,
          bank_code,
          account_number,
          account_type,
          agency
        `)
        .eq('company_id', companyId)
        .order('bank_name');

      if (banksError) throw banksError;

      if (!banksData || banksData.length === 0) {
        setBankBalances([]);
        return;
      }

      // Calculate balances for each bank
      const balancesPromises = banksData.map(async (bank) => {
        // Get all transactions count first
        let countQuery = supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('bank_id', bank.id);

        let transactionQuery = supabase
          .from('transactions')
          .select('amount, transaction_type, transaction_date')
          .eq('bank_id', bank.id);

        // Apply filters based on period selection
        if (filterPeriod === 'month-ofx' && selectedMonth) {
          const startDate = `${selectedMonth}-01`;
          const endDate = `${selectedMonth}-31`;
          countQuery = countQuery
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate);
          transactionQuery = transactionQuery
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate);
        }

        const { data: transactions } = await transactionQuery.order('transaction_date', { ascending: false });
        const { count: totalTransactions } = await countQuery;

        // Get future entries if filtering by future month
        let futureEntries: any[] = [];
        if (filterPeriod === 'month-future' && selectedMonth) {
          const startDate = `${selectedMonth}-01`;
          const endDate = `${selectedMonth}-31`;
          
          const { data: futureData } = await supabase
            .from('future_entries')
            .select('amount, entry_type, due_date')
            .eq('company_id', companyId)
            .gte('due_date', startDate)
            .lte('due_date', endDate);
          
          futureEntries = futureData || [];
        }

        const creditTotal = (transactions
          ?.filter(t => t.transaction_type === 'credit')
          ?.reduce((sum, t) => sum + t.amount, 0) || 0) +
          (futureEntries
            ?.filter(f => f.entry_type === 'income')
            ?.reduce((sum, f) => sum + f.amount, 0) || 0);

        const debitTotal = (transactions
          ?.filter(t => t.transaction_type === 'debit')
          ?.reduce((sum, t) => sum + t.amount, 0) || 0) +
          (futureEntries
            ?.filter(f => f.entry_type === 'expense')
            ?.reduce((sum, f) => sum + f.amount, 0) || 0);

        const currentBalance = creditTotal - debitTotal;
        
        const lastTransactionDate = transactions && transactions.length > 0 
          ? transactions[0].transaction_date 
          : null;

        return {
          ...bank,
          current_balance: currentBalance,
          last_transaction_date: lastTransactionDate,
          transactions_count: totalTransactions || 0,
          credit_total: creditTotal,
          debit_total: debitTotal
        };
      });

      const balances = await Promise.all(balancesPromises);
      setBankBalances(balances);

    } catch (error) {
      console.error('Error fetching bank balances:', error);
      toast({
        title: "Erro ao carregar saldos",
        description: "Não foi possível carregar os saldos bancários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = bankBalances.reduce((sum, bank) => sum + bank.current_balance, 0);
  const totalCredit = bankBalances.reduce((sum, bank) => sum + bank.credit_total, 0);
  const totalDebit = bankBalances.reduce((sum, bank) => sum + bank.debit_total, 0);

  const groupBanksByCode = (balances: BankBalance[]): GroupedBank[] => {
    const grouped = new Map<string, GroupedBank>();
    
    balances.forEach(balance => {
      const key = balance.bank_code;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          bank_name: balance.bank_name,
          bank_code: balance.bank_code,
          accounts: [],
          total_balance: 0,
          total_credit: 0,
          total_debit: 0,
          total_transactions: 0
        });
      }
      
      const group = grouped.get(key)!;
      group.accounts.push(balance);
      group.total_balance += balance.current_balance;
      group.total_credit += balance.credit_total;
      group.total_debit += balance.debit_total;
      group.total_transactions += balance.transactions_count;
    });
    
    return Array.from(grouped.values());
  };

  const groupedBanks = groupBanksByCode(bankBalances);

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'checking': return 'Conta Corrente';
      case 'savings': return 'Poupança';
      default: return 'Conta';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          
          <p className="text-muted-foreground">Carregando saldos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
       
        <Button onClick={fetchBankBalances} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={filterPeriod} onValueChange={(value) => {
              setFilterPeriod(value);
              if (value === 'all') {
                setSelectedMonth('');
              }
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ver Geral</SelectItem>
                <SelectItem value="month-ofx">Mês - Lançamentos OFX</SelectItem>
                <SelectItem value="month-future">Mês - Lançamentos Futuros</SelectItem>
              </SelectContent>
            </Select>

            {(filterPeriod === 'month-ofx' || filterPeriod === 'month-future') && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Selecionar mês" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {format(new Date(`${month}-01`), 'MMM/yyyy', { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {filterPeriod !== 'all' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setFilterPeriod('all');
                  setSelectedMonth('');
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Saldo Total</p>
                <p className={`text-xl font-bold ${totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Total Entradas</p>
                <p className="text-xl font-bold text-success">
                  R$ {totalCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Total Saídas</p>
                <p className="text-xl font-bold text-destructive">
                  R$ {totalDebit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Contas Ativas</p>
                <p className="text-xl font-bold">
                  {bankBalances.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts Grouped */}
      <div className="grid gap-4">
        {bankBalances.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Nenhuma conta bancária encontrada</p>
              <p className="text-muted-foreground mb-4">
                Importe um arquivo OFX para começar a visualizar seus saldos bancários
              </p>
              <Button onClick={() => navigate('/upload-ofx')}>
                Importar Extrato OFX
              </Button>
            </CardContent>
          </Card>
        ) : (
          groupedBanks.map((group) => (
            <Card key={group.bank_code} className="overflow-hidden">
              {/* Bank Header */}
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{group.bank_name}</CardTitle>
                      <CardDescription>
                        {group.accounts.length} {group.accounts.length === 1 ? 'conta' : 'contas'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">Código: {group.bank_code}</Badge>
                </div>
                
                {/* Bank Summary */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Saldo Total</p>
                    <p className={`text-lg font-bold ${group.total_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      R$ {group.total_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Total Entradas</p>
                    <p className="text-lg font-bold text-success">
                      R$ {group.total_credit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Total Saídas</p>
                    <p className="text-lg font-bold text-destructive">
                      R$ {group.total_debit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Transações</p>
                    <p className="text-lg font-bold text-primary">
                      {group.total_transactions}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              {/* Individual Accounts */}
              <CardContent className="space-y-4 pt-6">
                {group.accounts.map((account, index) => (
                  <div key={account.id} className={index > 0 ? "pt-4 border-t" : ""}>
                    {/* Account Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {getAccountTypeLabel(account.account_type)} • {account.account_number}
                      </span>
                      {account.agency && (
                        <span className="text-sm text-muted-foreground">
                          • Agência: {account.agency}
                        </span>
                      )}
                    </div>
                    
                    {/* Account Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Saldo</p>
                        <p className={`text-base font-bold ${account.current_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                          R$ {account.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-success/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Entradas</p>
                        <p className="text-base font-bold text-success">
                          R$ {account.credit_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-destructive/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Saídas</p>
                        <p className="text-base font-bold text-destructive">
                          R$ {account.debit_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-primary/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Transações</p>
                        <p className="text-base font-bold text-primary">
                          {account.transactions_count}
                        </p>
                      </div>
                    </div>
                    
                    {/* Last Transaction */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Última transação: {' '}
                        {account.last_transaction_date 
                          ? format(new Date(account.last_transaction_date), 'dd/MM/yyyy', { locale: ptBR })
                          : 'Nenhuma transação'
                        }
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* View Transactions Button */}
                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/transactions')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Todas as Movimentações do {group.bank_name}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default BankBalances;