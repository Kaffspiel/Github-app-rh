import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Calendar, Clock, Upload, Brain, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useCompanyReports, DepartmentStats, EmployeeRanking } from "@/hooks/useCompanyReports";
import { ImportWizard } from "@/components/time-tracking/ImportWizard";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

interface AccumulatedRecord {
    employeeName: string;
    predictedHours: string;
    workedHours: string;
    bonusHours: string;
    balance: string;
}

interface AccumulatedReport {
    periodStart?: string;
    periodEnd?: string;
    companyName?: string;
    records: AccumulatedRecord[];
}

function parseHoursToNumber(h: string): number {
    if (!h || h === '-') return 0;
    const negative = h.startsWith('-');
    const clean = h.replace('-', '').trim();
    const parts = clean.split(':');
    const hours = parseInt(parts[0] || '0');
    const mins = parseInt(parts[1] || '0');
    const total = hours + mins / 60;
    return negative ? -total : total;
}

export function Absenteeism() {
    const { fetchCompanyStats, isLoading: isCompanyStatsLoading } = useCompanyReports();

    const [periodStart, setPeriodStart] = useState(format(new Date().setDate(1), 'yyyy-MM-dd'));
    const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [companyStats, setCompanyStats] = useState<{ departments: DepartmentStats[], topOffenders: EmployeeRanking[] } | null>(null);
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [accumulatedReport, setAccumulatedReport] = useState<AccumulatedReport | null>(null);
    const [isAIParsing, setIsAIParsing] = useState(false);

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

    const handlePDFUpload = useCallback(async (file: File) => {
        setIsAIParsing(true);
        try {
            // Extract text from PDF using pdf.js
            const buffer = await file.arrayBuffer();
            const { extractPDFText } = await import("@/services/timeImport");
            const content = await extractPDFText(buffer);

            toast.info("Analisando relatório acumulado com IA...");

            const { data, error } = await supabase.functions.invoke('parse-time-document', {
                body: {
                    fileContent: content.substring(0, 20000),
                    fileType: 'pdf',
                    fileName: file.name,
                },
            });

            if (error) throw new Error(error.message);
            if (!data?.success) throw new Error(data?.error || 'Falha no parsing');

            if (data.documentType === 'accumulated' && data.accumulatedRecords?.length > 0) {
                setAccumulatedReport({
                    periodStart: data.periodStart,
                    periodEnd: data.periodEnd,
                    companyName: data.companyName,
                    records: data.accumulatedRecords,
                });
                if (data.periodStart) setPeriodStart(data.periodStart);
                if (data.periodEnd) setPeriodEnd(data.periodEnd);
                toast.success(`Relatório importado: ${data.accumulatedRecords.length} colaboradores`);
            } else if (data.records?.length > 0) {
                // It's a daily report, use the normal import wizard
                toast.info("Documento identificado como registro diário. Use o Importar Registros.");
                setShowImportWizard(true);
            } else {
                toast.error("Nenhum dado encontrado no documento.");
            }
        } catch (err: any) {
            console.error('PDF parse error:', err);
            toast.error(`Erro ao processar PDF: ${err.message}`);
        } finally {
            setIsAIParsing(false);
        }
    }, []);

    const handleExportExcel = () => {
        const dataSource = accumulatedReport?.records;
        const statsSource = companyStats?.topOffenders;

        if (!dataSource?.length && !statsSource?.length) {
            toast.error("Sem dados para exportar");
            return;
        }

        const wb = XLSX.utils.book_new();

        if (dataSource?.length) {
            const rows = dataSource.map(e => ({
                "Colaborador": e.employeeName,
                "Horas Previstas": e.predictedHours,
                "Horas Trabalhadas": e.workedHours,
                "Abonos": e.bonusHours,
                "Saldo": e.balance,
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "Absenteísmo");
        } else if (statsSource?.length) {
            const rows = statsSource.map(e => ({
                "Nome": e.name,
                "Departamento": e.department,
                "Horas Previstas": e.predictedHours || 0,
                "Horas Reais": e.actualHours || 0,
                "Absenteísmo (%)": ((e.absenteeismRate || 0) * 100).toFixed(1),
                "Produtividade (%)": ((e.productivityScore || 0) * 100).toFixed(0)
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "Absenteísmo");
        }

        XLSX.writeFile(wb, `Relatorio_Absenteismo_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
        toast.success("Excel exportado com sucesso!");
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Absenteísmo & Produtividade</h1>
                    <p className="text-muted-foreground mt-1">Monitore a frequência e performance da equipe</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowImportWizard(true)}>
                        <Upload className="w-4 h-4 mr-2" /> Importar Registros
                    </Button>
                    <Button asChild disabled={isAIParsing}>
                        <label className="cursor-pointer">
                            {isAIParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                            {isAIParsing ? "Processando..." : "Importar Relatório PDF"}
                            <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handlePDFUpload(f);
                                    e.target.value = '';
                                }}
                            />
                        </label>
                    </Button>
                </div>
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
                    <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Filtros de Período</CardTitle>
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

            {/* Accumulated Report from PDF */}
            {accumulatedReport && accumulatedReport.records.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5" /> Relatório Acumulado
                                {accumulatedReport.companyName && (
                                    <span className="text-sm font-normal text-muted-foreground ml-2">— {accumulatedReport.companyName}</span>
                                )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Período: {accumulatedReport.periodStart || '?'} a {accumulatedReport.periodEnd || '?'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleExportExcel}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setAccumulatedReport(null)}>Limpar</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground font-medium">
                                    <tr>
                                        <th className="p-3">Colaborador</th>
                                        <th className="p-3 text-center">Previstas</th>
                                        <th className="p-3 text-center">Trabalhadas</th>
                                        <th className="p-3 text-center">Abonos</th>
                                        <th className="p-3 text-center">Saldo</th>
                                        <th className="p-3 text-center">Absenteísmo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accumulatedReport.records.map((emp, i) => {
                                        const predicted = parseHoursToNumber(emp.predictedHours);
                                        const worked = parseHoursToNumber(emp.workedHours);
                                        const absRate = predicted > 0 ? Math.max(0, ((predicted - worked) / predicted) * 100) : 0;
                                        const balanceNeg = emp.balance.startsWith('-');

                                        return (
                                            <tr key={i} className="border-t hover:bg-muted/50">
                                                <td className="p-3 font-medium">{emp.employeeName}</td>
                                                <td className="p-3 text-center">{emp.predictedHours || '-'}</td>
                                                <td className="p-3 text-center">{emp.workedHours || '-'}</td>
                                                <td className="p-3 text-center">{emp.bonusHours || '-'}</td>
                                                <td className="p-3 text-center">
                                                    <span className={balanceNeg ? "text-destructive font-semibold" : "text-green-600 font-semibold"}>
                                                        {emp.balance || '-'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Badge variant="outline" className={absRate > 5 ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-green-50 text-green-700 border-green-200"}>
                                                        {absRate.toFixed(1)}%
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Existing DB-based ranking */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Ranking de Produtividade & Absenteísmo</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Comparativo entre horas previstas e realizadas no período</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportExcel}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isCompanyStatsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Calculando indicadores...</div>
                    ) : companyStats ? (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground font-medium">
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
                                            <tr key={i} className="border-t hover:bg-muted/50">
                                                <td className="p-3">
                                                    <div className="font-medium">{emp.name}</div>
                                                    <div className="text-xs text-muted-foreground">{emp.department}</div>
                                                </td>
                                                <td className="p-3 text-center">{emp.predictedHours?.toFixed(1)}h</td>
                                                <td className="p-3 text-center">{emp.actualHours?.toFixed(1)}h</td>
                                                <td className="p-3 text-center">
                                                    <Badge variant="outline" className={absRate > 15 ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-green-50 text-green-700 border-green-200"}>
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
                                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum dado disponível para o período selecionado.</td></tr>
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
