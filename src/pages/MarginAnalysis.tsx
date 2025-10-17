import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface NFeItem {
  id: string;
  product_code: string;
  product_description: string;
  ncm: string;
  quantity: number;
  cost_price: number;
  sale_price: number;
  total_value: number;
  margin: number;
}

const MarginAnalysis = () => {
  const { user } = useAuth();
  const [nfeItems, setNfeItems] = useState<NFeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNFeItems();
  }, []);

  const fetchNFeItems = async () => {
    try {
      // First get NFe items with their document info
      const { data, error } = await supabase
        .from('nfe_items')
        .select(`
          id,
          product_code,
          product_description,
          ncm,
          quantity,
          unit_value,
          total_value,
          nfe_documents!inner(
            company_id,
            cfop
          )
        `)
        .order('unit_value', { ascending: false });

      if (error) throw error;

      // Get CFOP classifications separately
      const { data: classificationsData, error: classError } = await supabase
        .from('cfop_classifications')
        .select('cfop, classification');

      if (classError) throw classError;

      // Create classification map
      const classificationMap = (classificationsData || []).reduce((acc, item) => {
        acc[item.cfop] = item.classification;
        return acc;
      }, {} as Record<string, string>);

      // Group items by NCM to calculate cost and selling prices
      const ncmGroups = (data || []).reduce((acc, item) => {
        const ncm = item.ncm;
        if (!acc[ncm]) {
          acc[ncm] = {
            items: [],
            costItems: [],
            saleItems: []
          };
        }
        
        acc[ncm].items.push(item);
        
        // Check CFOP classification
        const classification = classificationMap[item.nfe_documents.cfop];
        if (classification === 'custo') {
          acc[ncm].costItems.push(item);
        } else if (classification === 'venda') {
          acc[ncm].saleItems.push(item);
        }
        
        return acc;
      }, {} as Record<string, any>);

      // Calculate margins for each NCM
      const itemsWithMargin: NFeItem[] = [];
      
      Object.values(ncmGroups).forEach((group: any) => {
        const avgCostPrice = group.costItems.length > 0 
          ? group.costItems.reduce((sum: number, item: any) => sum + item.unit_value, 0) / group.costItems.length
          : 0;
          
        const avgSalePrice = group.saleItems.length > 0
          ? group.saleItems.reduce((sum: number, item: any) => sum + item.unit_value, 0) / group.saleItems.length
          : 0;

        // Use the first item as representative for this NCM
        const representativeItem = group.items[0];
        
        // Set cost and sale prices based on CFOP classifications
        let costPrice = 0;
        let salePrice = 0;

        if (avgCostPrice > 0) {
          costPrice = avgCostPrice;
        }
        
        if (avgSalePrice > 0) {
          salePrice = avgSalePrice;
        }

        // If no classification, use original estimation
        if (costPrice === 0 && salePrice === 0) {
          salePrice = representativeItem.unit_value;
          costPrice = representativeItem.unit_value * 0.7; // Estimate 70% cost
        }

        const margin = salePrice - costPrice;

        itemsWithMargin.push({
          id: representativeItem.id,
          product_code: representativeItem.product_code,
          product_description: representativeItem.product_description,
          ncm: representativeItem.ncm,
          quantity: group.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
          cost_price: costPrice,
          sale_price: salePrice,
          total_value: representativeItem.total_value,
          margin: margin
        });
      });

      setNfeItems(itemsWithMargin);
    } catch (error) {
      console.error('Error fetching NFe items:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os itens das notas fiscais.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getMarginPercentage = (margin: number, sellingPrice: number) => {
    return sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'bg-success text-success-foreground';
    if (margin >= 15) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  const getMarginIcon = (margin: number) => {
    return margin >= 20 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      


      <div className="grid gap-4">
        {nfeItems.map((item) => {
          const marginPercentage = getMarginPercentage(item.margin, item.sale_price);
          
          return (
            <Card key={item.id} className="hover:shadow-elevated transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{item.product_description}</h3>
                      <Badge variant="secondary">NCM: {item.ncm}</Badge>
                      <Badge variant="outline">Código: {item.product_code}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Preço de Custo:</span>
                        <p className="font-medium">R$ {item.cost_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Preço de Venda:</span>
                        <p className="font-medium">R$ {item.sale_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margem Unitária:</span>
                        <p className="font-medium">R$ {item.margin.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quantidade:</span>
                        <p className="font-medium">{item.quantity}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getMarginIcon(marginPercentage)}
                    <Badge className={getMarginColor(marginPercentage)}>
                      {marginPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {nfeItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum item de NFe encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Importe notas fiscais XML para visualizar a análise de margens baseada no NCM
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarginAnalysis;