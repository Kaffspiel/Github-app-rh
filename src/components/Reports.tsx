import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, FileSpreadsheet, User, Calendar, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useEmployeesList } from "@/hooks/useEmployeesList"; // Ensure this import exists
import { useReports, EmployeeDossier, ReportRecord } from "@/hooks/useReports";
import { useCompanyReports, DepartmentStats, EmployeeRanking } from "@/hooks/useCompanyReports";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function Reports() {
  const { employees } = useEmployeesList();
  const { fetchEmployeeDossier, isLoading } = useReports();
  const { fetchCompanyStats, isLoading: isCompanyStatsLoading } = useCompanyReports();

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [reportType, setReportType] = useState("individual");
  const [periodStart, setPeriodStart] = useState(format(new Date().setDate(1), 'yyyy-MM-dd')); // Start of month?
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd')); // Today

  const [dossier, setDossier] = useState<EmployeeDossier | null>(null);
  const [companyStats, setCompanyStats] = useState<{ departments: DepartmentStats[], topOffenders: EmployeeRanking[] } | null>(null);

  useEffect(() => {
    if (reportType === "individual" && selectedEmployee) {
      loadDossier(selectedEmployee);
    }
    loadCompanyStats();
  }, [selectedEmployee, reportType, periodStart, periodEnd]);

  const loadDossier = async (empId: string) => {
    const startDate = periodStart ? new Date(periodStart) : undefined;
    const endDate = periodEnd ? new Date(periodEnd) : undefined;
    const data = await fetchEmployeeDossier(empId, startDate, endDate);
    setDossier(data);
  };

  const loadCompanyStats = async () => {
    const startDate = periodStart ? new Date(periodStart) : undefined;
    const endDate = periodEnd ? new Date(periodEnd) : undefined;
    const data = await fetchCompanyStats(startDate, endDate);
    if (data) setCompanyStats(data);
  };

  const handleExportExcel = () => {
    if (!companyStats) {
      toast.error("Sem dados para exportar");
      return;
    }

    // Prepare Sheets
    const wb = XLSX.utils.book_new();

    // Sheet 1: Department Stats
    const deptData = companyStats.departments.map(d => ({
      "Equipe": d.name,
      "Colaboradores": d.employeeCount,
      "Total Ocorrências": d.totalOccurrences,
      "Total Tarefas": d.totalTasks,
      "Tarefas Atrasadas": d.delayedTasks,
      "Tarefas Concluídas": d.completedTasks,
      "Taxa de Ocorrência": d.occurrenceRate
    }));
    const wsDept = XLSX.utils.json_to_sheet(deptData);
    XLSX.utils.book_append_sheet(wb, wsDept, "Ranking Equipes");

    // Sheet 2: Top Offenders
    const offenderData = companyStats.topOffenders.map(e => ({
      "Nome": e.name,
      "Departamento": e.department,
      "Total Ocorrências": e.occurrences,
      "Tarefas Atrasadas": e.delayedTasks
    }));
    const wsOffenders = XLSX.utils.json_to_sheet(offenderData);
    XLSX.utils.book_append_sheet(wb, wsOffenders, "Top Reincidentes");

    // Save File
    XLSX.writeFile(wb, `Relatorio_Gestao_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success("Relatório Excel exportado com sucesso!");
  };

  const getRecordIcon = (type: ReportRecord["type"]) => {
    switch (type) {
      case "task":
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case "occurrence":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "justification":
        return <FileText className="w-4 h-4 text-purple-600" />;
      case "decision":
        return <FileText className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusBadge = (status?: ReportRecord["status"]) => {
    if (!status) return null;

    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aprovado</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejeitado</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Concluído</Badge>;
    }
  };

  const handleGeneratePDF = () => {
    if (!companyStats) {
      toast.error("Sem dados para gerar PDF");
      return;
    }

    const doc = new jsPDF();
    const today = format(new Date(), 'dd/MM/yyyy HH:mm');

    // Title
    doc.setFontSize(20);
    doc.text("Relatório de Gestão - OPS Control", 14, 22);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${today}`, 14, 30);
    doc.text(`Período: ${periodStart} a ${periodEnd}`, 14, 35);

    // Section 1: Department Ranking
    doc.setFontSize(14);
    doc.text("1. Ranking de Equipes (Ocorrências)", 14, 45);

    const deptTableBody = companyStats.departments.map(d => [
      d.name,
      d.employeeCount.toString(),
      d.totalOccurrences.toString(),
      d.occurrenceRate.toFixed(2)
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Equipe', 'Colaboradores', 'Total Ocorrências', 'Taxa (Oc./Colab.)']],
      body: deptTableBody,
    });

    // Section 2: Top Offenders
    const lastY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("2. Top 10 Reincidentes", 14, lastY);

    const offenderTableBody = companyStats.topOffenders.map(e => [
      e.name,
      e.department,
      e.occurrences.toString(),
      e.delayedTasks.toString()
    ]);

    autoTable(doc, {
      startY: lastY + 5,
      head: [['Nome', 'Departamento', 'Ocorrências', 'Tarefas Atrasadas']],
      body: offenderTableBody,
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    doc.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' });
    }

    doc.save(`Relatorio_PDF_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const handleGenerateEmployeePDF = (data: EmployeeDossier) => {
    const doc = new jsPDF();
    const today = format(new Date(), 'dd/MM/yyyy HH:mm');

    // Title & Profile
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text("Dossiê do Colaborador", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${today}`, 14, 28);
    if (periodStart || periodEnd) {
      doc.text(`Período consultado: ${periodStart || 'Início'} até ${periodEnd || 'Hoje'}`, 14, 33);
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(data.name, 14, 45);
    doc.setFontSize(12);
    doc.text(`${data.position} - ${data.department}`, 14, 51);
    doc.text(`Data de Admissão: ${data.admissionDate}`, 14, 57);

    // Summary Section
    doc.setFontSize(14);
    doc.text("Resumo de Performance", 14, 70);

    const summaryData = [
      ["Total de Tarefas", data.summary.totalTasks.toString()],
      ["Tarefas Concluídas", data.summary.completedTasks.toString()],
      ["Tarefas Atrasadas", data.summary.delayedTasks.toString()],
      ["Ocorrências de Ponto", data.summary.occurrences.toString()],
      ["Justificativas", data.summary.justifications.toString()],
      ["Reincidências", data.summary.reoccurrences.toString()]
    ];

    autoTable(doc, {
      startY: 75,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // History Section
    const lastY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("Histórico de Registros", 14, lastY);

    const historyData = data.records.map(r => [
      r.date,
      r.title,
      r.type === 'task' ? 'Tarefa' : r.type === 'occurrence' ? 'Ocorrência' : r.type === 'justification' ? 'Justificativa' : 'Decisão',
      r.description
    ]);

    autoTable(doc, {
      startY: lastY + 5,
      head: [['Data', 'Título', 'Tipo', 'Descrição']],
      body: historyData,
      columnStyles: {
        3: { cellWidth: 80 }
      }
    });

    doc.save(`Dossie_${data.name.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    toast.success("Dossiê PDF gerado com sucesso!");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios & Dossiê</h1>
          <p className="text-gray-500 mt-1">Gere relatórios e consulte dossiês completos</p>
        </div>
      </div>

      <Tabs defaultValue="dossier" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="dossier">Dossiê do Colaborador</TabsTrigger>
          <TabsTrigger value="generate">Relatórios Avançados</TabsTrigger>
        </TabsList>

        <TabsContent value="dossier" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Colaborador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Colaborador</Label>
                  <Select value={selectedEmployee || ""} onValueChange={setSelectedEmployee}>
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
                <div className="flex-1 space-y-2">
                  <Label>Início (Opcional)</Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Fim (Opcional)</Label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading && <div className="text-center py-4 text-gray-500">Carregando dados...</div>}

          {!isLoading && !dossier && selectedEmployee && (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              Nenhum dado encontrado para o período.
            </div>
          )}

          {!isLoading && !selectedEmployee && (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
              Selecione um colaborador acima para visualizar o dossiê.
            </div>
          )}

          {dossier && (
            <>
              <Card>
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white">
                      <User className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl">{dossier.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {dossier.position} • {dossier.department}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Admissão: {dossier.admissionDate}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => handleGenerateEmployeePDF(dossier)}>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Dossiê
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{dossier.summary.totalTasks}</div>
                      <p className="text-xs text-gray-500 mt-1">Total Tarefas</p>
                    </div>
                  </CardContent>
                </Card>
                {/* ... other summary cards ... */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{dossier.summary.completedTasks}</div>
                      <p className="text-xs text-gray-500 mt-1">Concluídas</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{dossier.summary.delayedTasks}</div>
                      <p className="text-xs text-gray-500 mt-1">Atrasadas</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{dossier.summary.occurrences}</div>
                      <p className="text-xs text-gray-500 mt-1">Ocorrências</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{dossier.summary.justifications}</div>
                      <p className="text-xs text-gray-500 mt-1">Justificativas</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{dossier.summary.reoccurrences}</div>
                      <p className="text-xs text-red-700 mt-1">Reincidências</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Histórico Completo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dossier.records.length === 0 && <p className="text-gray-500 text-sm">Nenhum registro encontrado.</p>}
                    {dossier.records.map((record) => (
                      <div key={record.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center">
                          {getRecordIcon(record.type)}
                          <div className="w-px h-full bg-gray-200 mt-2" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{record.title}</h3>
                                {getStatusBadge(record.status)}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                              <p className="text-xs text-gray-400 mt-2">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {record.date}
                              </p>

                              {/* Display simple details if any */}
                              {record.details && Object.keys(record.details).length > 0 && typeof record.details === 'object' && (
                                <div className="mt-2 text-xs text-gray-500">
                                  {Object.entries(record.details).map(([key, val]) => (
                                    val ? <span key={key} className="mr-3 capitalize"><b>{key}:</b> {String(val)}</span> : null
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <Card className="col-span-1 md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Painel de Gestão (Equipes & Reincidências)</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportExcel()}>
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleGeneratePDF()}>
                  <FileText className="w-4 h-4 mr-2 text-red-600" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isCompanyStatsLoading ? (
                <div className="text-center py-4 text-gray-500">Carregando métricas...</div>
              ) : companyStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Ranking de Equipes */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Ranking de Equipes (Ocorrências/Pessoa)
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium">
                          <tr>
                            <th className="p-3">Equipe</th>
                            <th className="p-3 text-center">Colab.</th>
                            <th className="p-3 text-center">Ocorrências</th>
                            <th className="p-3 text-right">Taxa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyStats.departments.map((dept, i) => (
                            <tr key={i} className="border-t hover:bg-gray-50">
                              <td className="p-3 font-medium">{dept.name}</td>
                              <td className="p-3 text-center">{dept.employeeCount}</td>
                              <td className="p-3 text-center text-orange-600 font-bold">{dept.totalOccurrences}</td>
                              <td className="p-3 text-right">{dept.occurrenceRate.toFixed(1)}</td>
                            </tr>
                          ))}
                          {companyStats.departments.length === 0 && (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-500">Sem dados</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Ranking de Reincidentes */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Top Reincidentes (Colaboradores)
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium">
                          <tr>
                            <th className="p-3">Colaborador</th>
                            <th className="p-3">Equipe</th>
                            <th className="p-3 text-center">Ponto</th>
                            <th className="p-3 text-center">Tarefas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyStats.topOffenders.map((emp, i) => (
                            <tr key={i} className="border-t hover:bg-gray-50">
                              <td className="p-3 font-medium">{emp.name}</td>
                              <td className="p-3 text-gray-500">{emp.department}</td>
                              <td className="p-3 text-center text-orange-600 font-bold">{emp.occurrences}</td>
                              <td className="p-3 text-center text-red-600">{emp.delayedTasks}</td>
                            </tr>
                          ))}
                          {companyStats.topOffenders.length === 0 && (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-500">Parabéns! Nenhuma reincidência grave encontrada.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Button onClick={() => loadCompanyStats()}>Carregar Dados da Empresa</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
