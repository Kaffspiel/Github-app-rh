import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, AlertCircle, CheckCircle, XCircle, Clock, Download, Play, Plus, FileSpreadsheet, History } from "lucide-react";
import { useApp, TimeRecord } from "@/context/AppContext";
import { ImportWizard } from "@/components/time-tracking/ImportWizard";

const WORK_SCHEDULE = {
  entry1: "09:00",
  exit1: "12:00",
  entry2: "13:00",
  exit2: "18:00",
  tolerance: 10,
};

export function TimeTracking() {
  const { timeRecords, addTimeRecord } = useApp();
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
  const [showJustificationDialog, setShowJustificationDialog] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [activeTab, setActiveTab] = useState("records");

  const [simEmployee, setSimEmployee] = useState("Novo Funcionário");
  const [simEntry1, setSimEntry1] = useState("");
  const [simExit1, setSimExit1] = useState("");
  const [simEntry2, setSimEntry2] = useState("");
  const [simExit2, setSimExit2] = useState("");

  const parseTime = (timeStr: string) => {
    if (!timeStr || timeStr === "-") return null;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const calculateStatus = (e1: string, s1: string, e2: string, s2: string): { status: TimeRecord["status"]; issue?: string } => {
    const tE1 = parseTime(e1);
    const tS1 = parseTime(s1);
    const tE2 = parseTime(e2);
    const tS2 = parseTime(s2);

    const schedE1 = parseTime(WORK_SCHEDULE.entry1)!;

    if (tE1 === null) {
      return { status: "absence", issue: "Falta Integral" };
    }

    if (tE1 > schedE1 + WORK_SCHEDULE.tolerance) {
      const diff = tE1 - schedE1;
      return { status: "delay", issue: `Atraso de ${diff} minutos na entrada` };
    }

    if ((tE1 && !tS1 && (tE2 || tS2)) || (tE2 && !tS2)) {
      return { status: "missing-punch", issue: "Marcação ímpar (esqueceu saída)" };
    }

    return { status: "normal" };
  };

  const handleSimulatePunch = () => {
    if (!simEntry1 && !simExit1 && !simEntry2 && !simExit2) return;

    const { status, issue } = calculateStatus(simEntry1, simExit1, simEntry2, simExit2);

    const newRecord: TimeRecord = {
      id: Math.random().toString(),
      employee: simEmployee,
      date: new Date().toLocaleDateString("pt-BR"),
      entry1: simEntry1 || "-",
      exit1: simExit1 || "-",
      entry2: simEntry2 || "-",
      exit2: simExit2 || "-",
      status,
      issue
    };

    addTimeRecord(newRecord);

    setSimEntry1("");
    setSimExit1("");
    setSimEntry2("");
    setSimExit2("");
  };

  const getStatusIcon = (status: TimeRecord["status"]) => {
    switch (status) {
      case "normal": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "delay": return <Clock className="w-4 h-4 text-orange-600" />;
      case "absence": return <XCircle className="w-4 h-4 text-red-600" />;
      case "error": return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case "missing-punch": return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: TimeRecord["status"]) => {
    switch (status) {
      case "normal": return <Badge className="bg-green-100 text-green-700 border-green-200">Normal</Badge>;
      case "delay": return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Atraso</Badge>;
      case "absence": return <Badge className="bg-red-100 text-red-700 border-red-200">Falta</Badge>;
      case "error": return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Erro</Badge>;
      case "missing-punch": return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Batida Ausente</Badge>;
    }
  };

  const handleRequestJustification = (record: TimeRecord) => {
    setSelectedRecord(record);
    setShowJustificationDialog(true);
  };

  if (showImportWizard) {
    return (
      <div className="p-6">
        <ImportWizard
          onComplete={() => setShowImportWizard(false)}
          onCancel={() => setShowImportWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Controle de Ponto</h1>
          <p className="text-gray-500 mt-1">Gerencie registros de ponto e ocorrências</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Exportar
          </Button>
          <Button onClick={() => setShowImportWizard(true)}>
            <Upload className="w-4 h-4 mr-2" /> Importar Arquivo
          </Button>
        </div>
      </div>

      {/* SIMULATOR */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="w-5 h-5 text-green-400" />
            Simulador de Teste (Engine de Regras)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-slate-300">Colaborador</Label>
              <Input
                value={simEmployee}
                onChange={(e) => setSimEmployee(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white w-full md:w-1/3"
                placeholder="Nome do Funcionário"
              />
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Entrada 1</Label>
                <Input
                  type="time"
                  value={simEntry1}
                  onChange={(e) => setSimEntry1(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white w-[110px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Saída 1</Label>
                <Input
                  type="time"
                  value={simExit1}
                  onChange={(e) => setSimExit1(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white w-[110px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Entrada 2</Label>
                <Input
                  type="time"
                  value={simEntry2}
                  onChange={(e) => setSimEntry2(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white w-[110px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Saída 2</Label>
                <Input
                  type="time"
                  value={simExit2}
                  onChange={(e) => setSimExit2(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white w-[110px]"
                />
              </div>

              <Button onClick={handleSimulatePunch} className="bg-green-600 hover:bg-green-700 text-white h-10 px-6">
                <Plus className="w-4 h-4 mr-2" /> Simular Dia
              </Button>
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-700">
              Regras Ativas: Tolerância de 10 minutos (09:00). Batidas ímpares geram "Batida Ausente".
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total de Registros</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{timeRecords.length}</div><p className="text-xs text-gray-500 mt-1">Hoje</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Normais</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{timeRecords.filter(r => r.status === "normal").length}</div>
            <p className="text-xs text-green-600 mt-1">Sem ocorrências</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-700">Atrasos</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{timeRecords.filter(r => r.status === "delay").length}</div>
            <p className="text-xs text-orange-600 mt-1">Requer atenção</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-700">Erros</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{timeRecords.filter(r => r.status === "error" || r.status === "missing-punch").length}</div>
            <p className="text-xs text-yellow-600 mt-1">Verificar</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-700">Faltas</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{timeRecords.filter(r => r.status === "absence").length}</div>
            <p className="text-xs text-red-600 mt-1">Crítico</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Ponto</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Entrada 1</TableHead>
                <TableHead>Saída 1</TableHead>
                <TableHead>Entrada 2</TableHead>
                <TableHead>Saída 2</TableHead>
                <TableHead>Ocorrência</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeRecords.map((record) => (
                <TableRow key={record.id} className={record.status !== "normal" ? "bg-yellow-50/50" : ""}>
                  <TableCell>{getStatusIcon(record.status)}</TableCell>
                  <TableCell className="font-medium">{record.employee}</TableCell>
                  <TableCell>{record.date}</TableCell>
                  <TableCell>{record.entry1}</TableCell>
                  <TableCell>{record.exit1}</TableCell>
                  <TableCell>{record.entry2}</TableCell>
                  <TableCell>{record.exit2}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(record.status)}
                      {record.issue && <p className="text-xs text-gray-500">{record.issue}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {record.status !== "normal" && !record.justification && (
                        <Button size="sm" variant="outline" onClick={() => handleRequestJustification(record)}>
                          Solicitar Justificativa
                        </Button>
                      )}
                      {record.justification && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-600">
                          {record.justification.status === "pending" && "Aguardando"}
                          {record.justification.status === "approved" && "Aprovada"}
                          {record.justification.status === "rejected" && "Negada"}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showJustificationDialog} onOpenChange={setShowJustificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Justificativa</DialogTitle>
            <DialogDescription>
              Enviar solicitação para {selectedRecord?.employee}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ocorrência</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium">{selectedRecord?.issue}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedRecord?.date}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prazo para resposta</Label>
              <Select defaultValue="24">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 horas</SelectItem>
                  <SelectItem value="24">24 horas</SelectItem>
                  <SelectItem value="48">48 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mensagem (opcional)</Label>
              <Textarea placeholder="Adicione uma mensagem personalizada..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJustificationDialog(false)}>Cancelar</Button>
            <Button onClick={() => setShowJustificationDialog(false)}>Enviar Solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
