import { useState, useEffect, useCallback } from "react";
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
import { Upload, AlertCircle, CheckCircle, XCircle, Clock, Download, Plus, FileSpreadsheet, History, Search, Filter, X } from "lucide-react";
import { useApp, TimeRecord } from "@/context/AppContext";
import { ImportWizard } from "@/components/time-tracking/ImportWizard";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { toast } from "sonner";

const WORK_SCHEDULE = {
  entry1: "09:00",
  exit1: "12:00",
  entry2: "13:00",
  exit2: "18:00",
  tolerance: 10,
};

const parseTime = (timeStr: string) => {
  if (!timeStr || timeStr === "-") return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const calculateStatus = (e1: string, scheduleStart: string): { status: TimeRecord["status"]; issue?: string } => {
  const tE1 = parseTime(e1);
  const schedE1 = parseTime(scheduleStart)!;

  if (tE1 === null) {
    return { status: "absence", issue: "Falta Integral" };
  }

  if (tE1 > schedE1 + WORK_SCHEDULE.tolerance) {
    const diff = tE1 - schedE1;
    return { status: "delay", issue: `Atraso de ${diff} minutos` };
  }

  return { status: "normal" };
};

export function TimeTracking() {
  const { addTimeRecord } = useApp(); // Keep addTimeRecord for simulator if needed


  const { companyId } = useCompany();
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const fetchTimeRecords = useCallback(async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('time_tracking_records')
        .select(`
          *,
          employees (
            name,
            work_schedule_start
          )
        `)
        .eq('company_id', companyId)
        .order('record_date', { ascending: false });

      if (error) throw error;

      const mappedRecords: TimeRecord[] = (data || []).map(r => {
        const entry1 = r.entry_1 || "-";
        const scheduleStart = r.employees?.work_schedule_start || "09:00";

        // Calculate status based on rules (Entry only)
        const calculated = calculateStatus(entry1, scheduleStart);

        return {
          id: r.id,
          employee: r.employees?.name || r.external_employee_id || "Desconhecido",
          date: r.record_date,
          entry1,
          exit1: "-", // Unused
          entry2: "-", // Unused
          exit2: "-", // Unused
          status: calculated.status,
          issue: calculated.issue || (r.anomalies && r.anomalies.length > 0 ? r.anomalies.join(", ") : undefined),
          expectedStart: scheduleStart
        };
      });

      setTimeRecords(mappedRecords);
    } catch (error) {
      console.error("Error fetching time records:", error);
      toast.error("Erro ao carregar registros de ponto");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchTimeRecords();
  }, [fetchTimeRecords]);

  // Derived filtered records
  const filteredRecords = timeRecords.filter(record => {
    const matchesSearch = record.employee.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesDate = !dateFilter || record.date === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Refetch when wizard closes
  const handleWizardComplete = () => {
    setShowImportWizard(false);
    fetchTimeRecords();
  };

  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
  const [showJustificationDialog, setShowJustificationDialog] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [activeTab, setActiveTab] = useState("records");

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("");
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
          mode="time-tracking"
          onComplete={handleWizardComplete}
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



      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total de Registros</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{filteredRecords.length}</div><p className="text-xs text-gray-500 mt-1">Filtrados</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Normais</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{filteredRecords.filter(r => r.status === "normal").length}</div>
            <p className="text-xs text-green-600 mt-1">Sem ocorrências</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-700">Atrasos</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{filteredRecords.filter(r => r.status === "delay").length}</div>
            <p className="text-xs text-orange-600 mt-1">Requer atenção</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-700">Erros</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{filteredRecords.filter(r => r.status === "error" || r.status === "missing-punch").length}</div>
            <p className="text-xs text-yellow-600 mt-1">Verificar</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-700">Faltas</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{filteredRecords.filter(r => r.status === "absence").length}</div>
            <p className="text-xs text-red-600 mt-1">Crítico</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar Colaborador</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome do colaborador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="delay">Atraso</SelectItem>
                  <SelectItem value="absence">Falta</SelectItem>
                  <SelectItem value="missing-punch">Batida Ausente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Filtrar por Data</Label>
              <Input
                id="date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            {(searchTerm || statusFilter !== "all" || dateFilter) && (
              <Button variant="ghost" className="h-10 text-gray-500" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" /> Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Registros de Ponto</CardTitle>
          <Badge variant="outline" className="font-normal">
            Exibindo {filteredRecords.length} de {timeRecords.length} registros
          </Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Previsto</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <TableRow key={record.id} className={record.status !== "normal" ? "bg-yellow-50/50" : ""}>
                    <TableCell>{getStatusIcon(record.status)}</TableCell>
                    <TableCell className="font-medium">{record.employee}</TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell className="text-gray-500">{record.expectedStart}</TableCell>
                    <TableCell className={record.status === 'delay' ? "font-bold text-orange-600" : ""}>{record.entry1}</TableCell>
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Filter className="h-8 w-8 text-gray-300" />
                      <p>Nenhum registro encontrado com os filtros aplicados.</p>
                      <Button variant="link" onClick={clearFilters}>Limpar todos os filtros</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
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
