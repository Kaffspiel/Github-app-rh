import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Users, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { StrategicRHAgent } from "./StrategicRHAgent";

export function StrategicRH() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
    const [loading, setLoading] = useState(true);

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("employees")
            .select("id, name, department")
            .eq("is_active", true)
            .order("name");

        if (!error && data) {
            setEmployees(data);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <Brain className="w-8 h-8 text-indigo-600" />
                        RH Estratégico
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Análise Inteligente e Suporte à Decisão baseado no histórico
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-1 shadow-sm border-indigo-100 h-fit">
                    <CardHeader className="pb-3 text-indigo-900">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Contexto do Agente
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="employee-select">Selecionar Funcionário</Label>
                            {loading ? (
                                <Skeleton className="h-10 w-full" />
                            ) : (
                                <Select
                                    value={selectedEmployeeId}
                                    onValueChange={setSelectedEmployeeId}
                                >
                                    <SelectTrigger id="employee-select" className="bg-white">
                                        <SelectValue placeholder="Todos os funcionários" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Geral (Sem foco)</SelectItem>
                                        {employees.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.name} ({emp.department})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Dica</AlertTitle>
                            <AlertDescription className="text-xs">
                                Ao selecionar um funcionário, o Agente de IA focará as respostas no histórico específico dele.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                <div className="lg:col-span-3">
                    <StrategicRHAgent
                        selectedEmployeeId={selectedEmployeeId}
                        employeeName={selectedEmployee?.name}
                    />
                </div>
            </div>
        </div>
    );
}
