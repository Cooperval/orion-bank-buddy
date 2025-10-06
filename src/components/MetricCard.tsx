import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  variant: "success" | "danger" | "info" | "default";
  trend?: "up" | "down";
}

export function MetricCard({ title, value, icon: Icon, variant, trend }: MetricCardProps) {
  const variantStyles = {
    success: "border-l-4 border-l-success bg-success/5",
    danger: "border-l-4 border-l-danger bg-danger/5",
    info: "border-l-4 border-l-info bg-info/5",
    default: "border-l-4 border-l-primary bg-primary/5",
  };

  const iconVariantStyles = {
    success: "text-success bg-success/10",
    danger: "text-danger bg-danger/10",
    info: "text-info bg-info/10",
    default: "text-primary bg-primary/10",
  };

  return (
    <Card className={`shadow-card hover:shadow-card-hover transition-all duration-300 ${variantStyles[variant]}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">{value}</p>
              {trend && Icon && (
                <Icon
                  className={`h-5 w-5 ${
                    trend === "up" ? "text-success" : "text-danger"
                  }`}
                />
              )}
            </div>
          </div>
          {Icon && (
            <div className={`p-3 rounded-xl ${iconVariantStyles[variant]}`}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
