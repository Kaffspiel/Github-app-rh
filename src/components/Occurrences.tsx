import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { Plus, Search, Trophy, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Occurrences() {
    const [occurrences, setOccurrences] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    const { companyId } = useCompany();

    // New occurrence form state
    const [formData, setFormData] = useState({
        employee_id: "",
        type: "aprovacao_tarefa",
        points: "10",
        description: ""
    });

    useEffect(() => {
        if (companyId) {
            fetchData();
        }
    }, [companyId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch employees for selection
            const { data: employeesData, error: empError } = await supabase
                .from("employees")
                .select("id, name, department")
                .eq("company_id", companyId)
                .order("name");

            if (empError) throw empError;
            setEmployees(employeesData || []);

            // Fetch occurrences
            const { data: occData, error: occError } = await supabase
                .from("occurrences")
                .select(`
          *,
          employees (name)
        `)
                .eq("company_id", companyId)
                .order("created_at", { ascending: false });

            if (occError) throw occError;
            setOccurrences(occData || []);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar dados",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const calculatePoints = (type: string) => {
        switch (type) {
            case 'aprovacao_tarefa': return 10; // Cumpriu tarefa antes do prazo
            case 'atraso_tarefa': return -5; // Atrasou tarefa
            case 'falta': return -20; // Faltou
            case 'atestado': return -5; // Aplicou atestado (neutral or small penalty depending on policy, user said -points)
            case 'pontualidade_positiva': return 5; // Chegou na hora
            case 'pontualidade_negativa': return -5; // Atrasou
            default: return 0;
        }
    };

    const handleTypeChange = (value: string) => {
        setFormData({
            ...formData,
            type: value,
            points: calculatePoints(value).toString()
        });
    };

    const handleSubmit = async () => {
        if (!formData.employee_id || !formData.description) {
            toast({
                title: "Campos obrigatórios",
                description: "Selecione um funcionário e adicione uma descrição.",
                variant: "destructive"
            });
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from("occurrences")
                .insert({
                    company_id: companyId,
                    employee_id: formData.employee_id,
                    type: formData.type,
                    points: parseInt(formData.points),
                    description: formData.description,
                    created_by: user?.id
                });

            if (error) throw error;

            toast({
                title: "Ocorrência registrada!",
                description: `${formData.points} pontos atribuídos.`
            });

            setIsDialogOpen(false);
            setFormData({
                employee_id: "",
                type: "aprovacao_tarefa",
                points: "10",
                description: ""
            });
            fetchData();
        } catch (error: any) {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'aprovacao_tarefa': return "Tarefa Antecipada";
            case 'atraso_tarefa': return "Tarefa Atrasada";
            case 'falta': return "Falta";
            case 'atestado': return "Atestado";
            case 'pontualidade_positiva': return "Pontualidade (+)";
            case 'pontualidade_negativa': return "Atraso (-)";
            default: return type;
        }
    };

    const getPointsColor = (points: number) => {
        return points > 0 ? "text-green-600" : "text-red-600";
    };

    const filteredOccurrences = occurrences.filter(occ =>
        occ.employees?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        occ.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-yellow-600" />
                        Ocorrências e Pontuação
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gerencie pontos e ocorrências dos funcionários
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Nova Ocorrência
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar Nova Ocorrência</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Funcionário</label>
                                <Select
                                    value={formData.employee_id}
                                    onValueChange={(val) => setFormData({ ...formData, employee_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo de Ocorrência</label>
                                <Select
                                    value={formData.type}
                                    onValueChange={handleTypeChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="aprovacao_tarefa">Cumpriu tarefa antes do prazo (+)</SelectItem>
                                        <SelectItem value="pontualidade_positiva">Chegou na hora (+)</SelectItem>
                                        <SelectItem value="atraso_tarefa">Atrasou tarefa (-)</SelectItem>
                                        <SelectItem value="pontualidade_negativa">Chegou atrasado (-)</SelectItem>
                                        <SelectItem value="atestado">Aplicou atestado (-)</SelectItem>
                                        <SelectItem value="falta">Faltou (-)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Pontos</label>
                                <Input
                                    type="number"
                                    value={formData.points}
                                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição</label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Detalhes sobre a ocorrência..."
                                />
                            </div>

                            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                                {submitting ? "Salvando..." : "Registrar Ocorrência"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por funcionário ou descrição..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4">
                {filteredOccurrences.map((occ) => (
                    <Card key={occ.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="font-bold text-lg">{occ.employees?.name}</span>
                                <span className="text-sm text-gray-500">{getTypeLabel(occ.type)}</span>
                                <span className="text-xs text-gray-400">
                                    {format(new Date(occ.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </span>
                                <p className="mt-2 text-gray-700">{occ.description}</p>
                            </div>
                            <div className={`text-2xl font-bold ${getPointsColor(occ.points)}`}>
                                {occ.points > 0 ? "+" : ""}{occ.points} pts
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {filteredOccurrences.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        Nenhuma ocorrência encontrada.
                    </div>
                )}
            </div>
        </div>
    );
}
