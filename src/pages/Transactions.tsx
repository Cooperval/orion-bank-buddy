import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Building2,
  CreditCard,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

interface Transaction {
  id: string;
  transaction_date: string;
  amount: number;
  description: string;
  transaction_type: 'debit' | 'credit';
  memo?: string;
  fitid?: string;
  banks: {
    bank_name: string;
    account_number: string;
    bank_code: string;
  };
}

interface Bank {
  id: string;
  bank_name: string;
  account_number: string;
  bank_code: string;
}

const Transactions = () => {
  const { companyId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBank, setSelectedBank] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, searchTerm, selectedBank, selectedType, dateFrom, dateTo]);

  useEffect(() => {
    // Reset to first page when filters change (but not when data is being fetched)
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, selectedBank, selectedType, dateFrom, dateTo]);

  // Real-time updates for transactions and uploads
  useEffect(() => {
    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ofx_uploads'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);

      // Fetch banks
      const { data: banksData, error: banksError } = await supabase
        .from('banks')
        .select('id, bank_name, account_number, bank_code')
        .eq('company_id', companyId)
        .order('bank_name');

      if (banksError) throw banksError;
      setBanks(banksData || []);

      // Build filters
      let query = supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          amount,
          description,
          transaction_type,
          memo,
          fitid,
          banks!inner (
            bank_name,
            account_number,
            bank_code
          )
        `, { count: 'exact' })
        .eq('company_id', companyId);

      // Apply filters
      if (selectedBank !== 'all') {
        query = query.eq('banks.bank_code', selectedBank);
      }
      if (selectedType !== 'all') {
        query = query.eq('transaction_type', selectedType);
      }
      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,memo.ilike.%${searchTerm}%`);
      }
      if (dateFrom) {
        query = query.gte('transaction_date', format(dateFrom, 'yyyy-MM-dd'));
      }
      if (dateTo) {
        query = query.lte('transaction_date', format(dateTo, 'yyyy-MM-dd'));
      }

      // Add pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: transactionsData, error: transactionsError, count } = await query
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (transactionsError) throw transactionsError;
      
      // Type cast transaction_type to ensure proper typing
      const typedTransactions = (transactionsData || []).map(transaction => ({
        ...transaction,
        transaction_type: transaction.transaction_type as 'debit' | 'credit'
      }));
      
      setTransactions(typedTransactions);
      setTotalItems(count || 0);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as transações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary data separately (for filtered results)
  const fetchSummary = async () => {
    if (!companyId) return { totalCredit: 0, totalDebit: 0, totalCount: 0 };
    
    try {
      // Build the exact same query as fetchData but without pagination
      let query = supabase
        .from('transactions')
        .select(`
          amount, 
          transaction_type,
          description,
          memo,
          transaction_date,
          banks!inner (
            bank_name,
            account_number,
            bank_code
          )
        `)
        .eq('company_id', companyId);

      // Apply EXACTLY the same filters as main query
      if (selectedBank !== 'all') {
        query = query.eq('banks.bank_code', selectedBank);
      }
      if (selectedType !== 'all') {
        query = query.eq('transaction_type', selectedType);
      }
      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,memo.ilike.%${searchTerm}%`);
      }
      if (dateFrom) {
        query = query.gte('transaction_date', format(dateFrom, 'yyyy-MM-dd'));
      }
      if (dateTo) {
        query = query.lte('transaction_date', format(dateTo, 'yyyy-MM-dd'));
      }

      // Set explicit high limit to get all filtered transactions (Supabase defaults to 1000)
      const { data } = await query.limit(100000);
      
      if (!data) return { totalCredit: 0, totalDebit: 0, totalCount: 0 };

      const totalCredit = data.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      const totalDebit = data.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + t.amount, 0);
      
      return { totalCredit, totalDebit, totalCount: data.length };
    } catch (error) {
      console.error('Error fetching summary:', error);
      return { totalCredit: 0, totalDebit: 0, totalCount: 0 };
    }
  };

  const [summary, setSummary] = useState({ totalCredit: 0, totalDebit: 0, totalCount: 0 });

  // Fetch summary on initial load and when filters change
  useEffect(() => {
    fetchSummary().then(setSummary);
  }, [searchTerm, selectedBank, selectedType, dateFrom, dateTo]);

  const netAmount = summary.totalCredit - summary.totalDebit;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const csvData = transactions.map(t => ({
      Data: format(new Date(t.transaction_date), 'dd/MM/yyyy'),
      Descrição: t.description,
      Valor: t.amount,
      Tipo: t.transaction_type === 'credit' ? 'Crédito' : 'Débito',
      Banco: t.banks.bank_name,
      'Número da Conta': t.banks.account_number,
      Memo: t.memo || '',
      'ID Transação': t.fitid || ''
    }));

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimentacoes_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-6">
       
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Total Créditos</p>
                <p className="text-xl font-bold text-success">
                  R$ {summary.totalCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-sm text-muted-foreground">Total Débitos</p>
                <p className="text-xl font-bold text-destructive">
                  R$ {summary.totalDebit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                <p className={`text-xl font-bold ${netAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-sm text-muted-foreground">Total Transações</p>
                <p className="text-xl font-bold">
                  {totalItems}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Banco</label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os bancos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os bancos</SelectItem>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.bank_code}>
                      {bank.bank_name} ({bank.account_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transações</CardTitle>
              <CardDescription>
                {totalItems} transação(ões) encontrada(s) - Página {currentPage} de {totalPages}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Exibir:</span>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
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
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma transação encontrada</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{transaction.description}</p>
                          <Badge variant="outline" className="text-xs">
                            {transaction.banks.bank_name}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}
                          {transaction.memo && ` • ${transaction.memo}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Conta: {transaction.banks.account_number}
                          {transaction.fitid && ` • ID: ${transaction.fitid}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={transaction.transaction_type === 'credit' ? 'default' : 'destructive'}
                          className="text-base px-3 py-1"
                        >
                          {transaction.transaction_type === 'credit' ? '+' : '-'}
                          R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} transações
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = currentPage <= 3 ? i + 1 : 
                                    currentPage >= totalPages - 2 ? totalPages - 4 + i :
                                    currentPage - 2 + i;
                        
                        if (page < 1 || page > totalPages) return null;
                        
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;