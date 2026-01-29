import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, FileSpreadsheet, User, Calendar, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";

interface DossierRecord {
  id: string;
  date: string;
  type: "task" | "occurrence" | "justification" | "decision";
  title: string;
  description: string;
  status?: "pending" | "approved" | "rejected" | "completed";
  details?: any;
}

interface EmployeeDossier {
  id: string;
  name: string;
  department: string;
  position: string;
  admissionDate: string;
  records: DossierRecord[];
  summary: {
    totalTasks: number;
    completedTasks: number;
    delayedTasks: number;
    occurrences: number;
    justifications: number;
    reoccurrences: number;
  };
}

export function Reports() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [reportType, setReportType] = useState("individual");
  const [periodStart, setPeriodStart] = useState("2026-01-01");
  const [periodEnd, setPeriodEnd] = useState("2026-01-31");

  const employeeDossier: EmployeeDossier = {
    id: "1",
    name: "Maria Santos",
    department: "Operações",
    position: "Analista Operacional",
    admissionDate: "15/03/2023",
    summary: {
      totalTasks: 45,
      completedTasks: 42,
      delayedTasks: 3,
      occurrences: 5,
      justifications: 4,
      reoccurrences: 2,
    },
    records: [
      {
        id: "1",
        date: "28/01/2026 09:30",
        type: "occurrence",
        title: "Atraso de ponto",
        description: "Entrada às 09:15 - Previsto: 09:00",
        status: "pending",
      },
      {
        id: "2",
        date: "27/01/2026 10:00",
        type: "justification",
        title: "Justificativa de atraso",
        description: "Problema no transporte público - metrô atrasou",
        status: "approved",
        details: {
          attachment: "comprovante-metro.pdf",
          approvedBy: "João Silva (Gestor)",
          approvalDate: "27/01/2026 14:30",
          comments: "Justificativa aceita. Situação excepcional.",
        },
      },
      {
        id: "3",
        date: "26/01/2026 18:00",
        type: "task",
        title: "Tarefa concluída: Análise de vendas",
        description: "Compilar dados de vendas e identificar tendências",
        status: "completed",
        details: {
          completedOn: "26/01/2026 17:45",
          progress: 100,
          quality: "Excelente",
        },
      },
      {
        id: "4",
        date: "25/01/2026 16:00",
        type: "task",
        title: "Tarefa atrasada: Relatório mensal",
        description: "Preparação do relatório mensal de atividades",
        status: "completed",
        details: {
          dueDate: "25/01/2026 14:00",
          completedOn: "25/01/2026 16:00",
          delay: "2 horas",
        },
      },
      {
        id: "5",
        date: "24/01/2026 09:45",
        type: "occurrence",
        title: "Atraso de ponto",
        description: "Entrada às 09:10 - Previsto: 09:00 (REINCIDÊNCIA)",
        status: "approved",
        details: {
          recurrence: true,
          previousOccurrence: "17/01/2026",
        },
      },
      {
        id: "6",
        date: "20/01/2026 15:00",
        type: "decision",
        title: "Advertência verbal",
        description: "Advertência por reincidência de atrasos",
        details: {
          decidedBy: "João Silva (Gestor)",
          action: "Advertência verbal",
          followUp: "Acompanhamento por 30 dias",
        },
      },
    ],
  };

  const getRecordIcon = (type: DossierRecord["type"]) => {
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

  const getStatusBadge = (status?: DossierRecord["status"]) => {
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios & Dossiê</h1>
          <p className="text-gray-500 mt-1">Gere relatórios e consulte dossiês completos</p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="generate">Gerar Relatórios</TabsTrigger>
          <TabsTrigger value="dossier">Dossiê do Colaborador</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurar Relatório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Relatório</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual (Por Colaborador)</SelectItem>
                      <SelectItem value="team">Por Equipe</SelectItem>
                      <SelectItem value="store">Por Loja</SelectItem>
                      <SelectItem value="manager">Por Gestor</SelectItem>
                      <SelectItem value="consolidated">Consolidado Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {reportType === "individual" && (
                  <div className="space-y-2">
                    <Label>Colaborador</Label>
                    <Select value={selectedEmployee || ""} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o colaborador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maria">Maria Santos</SelectItem>
                        <SelectItem value="ana">Ana Lima</SelectItem>
                        <SelectItem value="pedro">Pedro Costa</SelectItem>
                        <SelectItem value="carlos">Carlos Rocha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Incluir no Relatório</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    "Tarefas",
                    "Ocorrências de Ponto",
                    "Justificativas",
                    "Decisões Administrativas",
                    "Performance (Gamificação)",
                    "Histórico Completo",
                  ].map((item) => (
                    <label key={item} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar PDF
                </Button>
                <Button variant="outline" className="flex-1">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Relatórios Rápidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">Ocorrências do Mês</p>
                    <p className="text-xs text-gray-500 mt-1">Todos os colaboradores</p>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">Performance da Equipe</p>
                    <p className="text-xs text-gray-500 mt-1">Ranking e métricas</p>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">Reincidências</p>
                    <p className="text-xs text-gray-500 mt-1">Colaboradores com padrão</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dossier" className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white">
                  <User className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{employeeDossier.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {employeeDossier.position} • {employeeDossier.department}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Admissão: {employeeDossier.admissionDate}
                  </p>
                </div>
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Dossiê Completo
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{employeeDossier.summary.totalTasks}</div>
                  <p className="text-xs text-gray-500 mt-1">Total Tarefas</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{employeeDossier.summary.completedTasks}</div>
                  <p className="text-xs text-gray-500 mt-1">Concluídas</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{employeeDossier.summary.delayedTasks}</div>
                  <p className="text-xs text-gray-500 mt-1">Atrasadas</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{employeeDossier.summary.occurrences}</div>
                  <p className="text-xs text-gray-500 mt-1">Ocorrências</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{employeeDossier.summary.justifications}</div>
                  <p className="text-xs text-gray-500 mt-1">Justificativas</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{employeeDossier.summary.reoccurrences}</div>
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
                {employeeDossier.records.map((record) => (
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
                            {record.details?.recurrence && (
                              <Badge variant="destructive" className="text-xs">REINCIDÊNCIA</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {record.date}
                          </p>

                          {record.details && (
                            <div className="mt-3 p-3 bg-white rounded border border-gray-200 text-sm space-y-1">
                              {record.type === "justification" && record.details.approvedBy && (
                                <>
                                  <p className="text-gray-600">
                                    <span className="font-medium">Aprovado por:</span> {record.details.approvedBy}
                                  </p>
                                  <p className="text-gray-600">
                                    <span className="font-medium">Comentários:</span> {record.details.comments}
                                  </p>
                                  {record.details.attachment && (
                                    <p className="text-blue-600">
                                      <FileText className="w-3 h-3 inline mr-1" />
                                      {record.details.attachment}
                                    </p>
                                  )}
                                </>
                              )}

                              {record.type === "decision" && (
                                <>
                                  <p className="text-gray-600">
                                    <span className="font-medium">Decidido por:</span> {record.details.decidedBy}
                                  </p>
                                  <p className="text-gray-600">
                                    <span className="font-medium">Ação:</span> {record.details.action}
                                  </p>
                                  <p className="text-gray-600">
                                    <span className="font-medium">Acompanhamento:</span> {record.details.followUp}
                                  </p>
                                </>
                              )}

                              {record.type === "task" && record.details.delay && (
                                <p className="text-orange-600">
                                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                                  <span className="font-medium">Atraso:</span> {record.details.delay}
                                </p>
                              )}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
