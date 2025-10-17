import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanOption {
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  features: PlanFeature[];
  ctaText: string;
}

const Plan = () => {
  const plans: PlanOption[] = [
    {
      name: "Teste",
      description: "30 dias de teste gratuito",
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        { text: "30 dias gratuitos", included: true },
        { text: "Importação ilimitada de NFes", included: true },
        { text: "Até 2 usuários", included: true },
        { text: "Relatórios básicos", included: true },
        { text: "Importação OFX", included: true },
        { text: "Classificação manual", included: true },
        { text: "Suporte por email", included: true },
        { text: "Classificação automática", included: false },
        { text: "Análise de margens", included: false },
      ],
      ctaText: "Iniciar Teste Grátis"
    },
    {
      name: "Pro",
      description: "Para empresas que querem crescer",
      monthlyPrice: 369.99,
      annualPrice: 369.99,
      popular: true,
      features: [
        { text: "Importação ilimitada de NFes", included: true },
        { text: "Usuários ilimitados", included: true },
        { text: "Relatórios avançados", included: true },
        { text: "Classificação automática", included: true },
        { text: "Análise de margens", included: true },
        { text: "Múltiplas empresas", included: true },
        { text: "Integração API", included: true },
        { text: "Dashboard personalizado", included: true },
        { text: "Suporte prioritário", included: true },
      ],
      ctaText: "Assinar Plano Pro"
    }
  ];

  const getPrice = (plan: PlanOption) => {
    if (plan.annualPrice === 0) return "Grátis";
    return plan.annualPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-card-foreground">
          Planos Anuais
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Comece com 30 dias gratuitos ou assine o plano Pro anual
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card 
            key={plan.name}
            className={cn(
              "relative transition-all hover:shadow-elevated",
              plan.popular && "border-primary shadow-financial"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground shadow-md">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Mais Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-8 pt-6">
              <CardTitle className="text-2xl text-card-foreground">
                {plan.name}
              </CardTitle>
              <CardDescription className="text-sm pt-2">
                {plan.description}
              </CardDescription>
              
              <div className="pt-6">
                <div className="flex items-baseline justify-center gap-1">
                  {plan.annualPrice === 0 ? (
                    <span className="text-4xl font-bold text-card-foreground">
                      Grátis
                    </span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-card-foreground">
                        R$ {getPrice(plan)}
                      </span>
                      <span className="text-muted-foreground">/ano</span>
                    </>
                  )}
                </div>
                {plan.annualPrice === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Por 30 dias
                  </p>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <Button 
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                size="lg"
              >
                {plan.ctaText}
              </Button>

              <div className="space-y-3 pt-2">
                {plan.features.map((feature, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3"
                  >
                    <Check 
                      className={cn(
                        "w-5 h-5 flex-shrink-0 mt-0.5",
                        feature.included 
                          ? "text-success" 
                          : "text-muted-foreground/30"
                      )}
                    />
                    <span className={cn(
                      "text-sm",
                      feature.included 
                        ? "text-card-foreground" 
                        : "text-muted-foreground line-through"
                    )}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ or Additional Info */}
      <Card className="max-w-3xl mx-auto bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">
            Experimente gratuitamente por 30 dias. Sem cartão de crédito. Cancele a qualquer momento. 
            <br />
            Dúvidas? Entre em contato com nossa equipe de vendas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Plan;