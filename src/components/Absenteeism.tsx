import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, User, Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useCompanyReports, DepartmentStats, EmployeeRanking } from "@/hooks/useCompanyReports";
import { ImportWizard } from "@/components/time-tracking/ImportWizard";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { Upload } from "lucide-react";

export function Absenteeism() {
    const { fetchCompanyStats, isLoading: isCompanyStatsLoading } = useCompanyReports();

    const [periodStart, setPeriodStart] = useState(format(new Date().setDate(1), 'yyyy-MM-dd'));
    const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [companyStats, setCompanyStats] = useState<{ departments: DepartmentStats[], topOffenders: EmployeeRanking[] } | null>(null);
    const [showImportWizard, setShowImportWizard] = useState(false);

    useEffect(() => {
        loadCompanyStats();
    }, [periodStart, periodEnd]);

    const loadCompanyStats = async () => {
        const startDate = periodStart ? new Date(periodStart) : undefined;
        const endDate = periodEnd ? new Date(periodEnd) : undefined;
        const data = await fetchCompanyStats(startDate, endDate);
        if (data) setCompanyStats(data);
    };

    const handleWizardComplete = () => {
        setShowImportWizard(false);
        loadCompanyStats();
    };

    const handleExportExcel = () => {
        if (!companyStats) {
            toast.error("Sem dados para exportar");
            return;
        }

        const wb = XLSX.utils.book_new();
        const data = companyStats.topOffenders.map(e => ({
            "Nome": e.name,
            "Departamento": e.department,
            "Horas Previstas": e.predictedHours || 0,
            "Horas Reais": e.actualHours || 0,
            "Absenteísmo (%)": ((e.absenteeismRate || 0) * 100).toFixed(1),
            "Produtividade (%)": ((e.productivityScore || 0) * 100).toFixed(0)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Absenteísmo");
        XLSX.writeFile(wb, `Relatorio_Absenteismo_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
        toast.success("Excel exportado com sucesso!");
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Absenteísmo & Produtividade</h1>
                    <p className="text-gray-500 mt-1">Monitore a frequência e performance da equipe</p>
                </div>
                <Button onClick={() => setShowImportWizard(true)}>
                    <Upload className="w-4 h-4 mr-2" /> Importar Registros
                </Button>
            </div>

            {showImportWizard && (
                <div className="mb-6">
                    <ImportWizard
                        onComplete={handleWizardComplete}
                        onCancel={() => setShowImportWizard(false)}
                    />
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Filtros de Período</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                            <Label>Início</Label>
                            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label>Fim</Label>
                            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Ranking de Produtividade & Absenteísmo</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Comparativo entre horas previstas e realizadas no período</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportExcel}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isCompanyStatsLoading ? (
                        <div className="text-center py-8 text-gray-400">Calculando indicadores...</div>
                    ) : companyStats ? (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700 font-medium">
                                    <tr>
                                        <th className="p-3">Colaborador</th>
                                        <th className="p-3 text-center">Horas Previstas</th>
                                        <th className="p-3 text-center">Horas Reais</th>
                                        <th className="p-3 text-center">Absenteísmo</th>
                                        <th className="p-3 text-center">Produtividade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companyStats.topOffenders.map((emp, i) => {
                                        const absRate = (emp.absenteeismRate || 0) * 100;
                                        const prodScore = (emp.productivityScore || 0) * 100;

                                        return (
                                            <tr key={i} className="border-t hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="font-medium">{emp.name}</div>
                                                    <div className="text-xs text-gray-500">{emp.department}</div>
                                                </td>
                                                <td className="p-3 text-center">{emp.predictedHours?.toFixed(1)}h</td>
                                                <td className="p-3 text-center">{emp.actualHours?.toFixed(1)}h</td>
                                                <td className="p-3 text-center">
                                                    <Badge variant="outline" className={absRate > 15 ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}>
                                                        {absRate.toFixed(1)}%
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-center font-bold">
                                                    <span className={prodScore < 70 ? "text-orange-600" : "text-blue-600"}>
                                                        {prodScore.toFixed(0)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {companyStats.topOffenders.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum dado disponível para o período selecionado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
