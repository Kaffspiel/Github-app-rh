import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { toast } from "sonner";
import { useEmployeesList } from "@/hooks/useEmployeesList";
import { useNotifications } from "@/hooks/useNotifications";
import { useColumnMappingTemplates } from "@/hooks/useColumnMappingTemplates";
import {
  Upload, FileSpreadsheet, FileText, CheckCircle2, XCircle,
  AlertTriangle, ArrowRight, Download, RefreshCw, Brain, FileType,
  BookTemplate, Save, Trash2, Star, StarOff
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import {
  parseExcel, getExcelHeaders,
  parseCsv, getCsvHeaders,
  parsePDF, extractPDFText,
  type ParseResult, type ColumnMapping, type FileFormat, type ParsedTimeRecord, type AccumulatedRecord
} from "@/services/timeImport";

interface ImportWizardProps {
  onComplete: () => void;
  onCancel: () => void;
  mode?: 'time-tracking' | 'absenteeism';
}

type Step = "upload" | "mapping" | "preview" | "importing" | "complete";
type ExtendedFileFormat = FileFormat | "pdf";

export function ImportWizard({ onComplete, onCancel, mode = 'time-tracking' }: ImportWizardProps) {
  const { companyId } = useCompany();
  const { employees } = useEmployeesList();
  const { notify, notifyClock } = useNotifications();
  const { templates, saveTemplate, deleteTemplate, setDefaultTemplate, defaultTemplate } = useColumnMappingTemplates("excel");

  const [step, setStep] = useState<Step>("upload");
  const [fileFormat, setFileFormat] = useState<ExtendedFileFormat>("excel");
  const [files, setFiles] = useState<File[]>([]);
  const [fileContents, setFileContents] = useState<Array<(ArrayBuffer | string)>>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    employeeId: "",
    employeeName: "",
    date: "",
    punch1: "",
    punch2: "",
    punch3: "",
    punch4: "",
  });
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [isAIParsing, setIsAIParsing] = useState(false);

  // Template management state
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isDetectingColumns, setIsDetectingColumns] = useState(false);

  const applyTemplate = (tpl: typeof defaultTemplate) => {
    if (tpl) setMapping(tpl.mapping);
  };

  const handleDetectColumns = async () => {
    if (files.length === 0 || fileContents.length === 0) return;

    // PDF não usa detecção de colunas manual, processamos direto pela IA no próximo passo
    if (fileFormat === "pdf") return;

    setIsDetectingColumns(true);
    try {
      // Convert Excel to CSV sample for AI analysis
      let csvSample = "";
      if (fileFormat === "excel") {
        const { utils, read } = await import("xlsx");
        const workbook = read(fileContents[0] as ArrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Send 30 rows so AI sees metadata + actual header + data rows
        csvSample = utils.sheet_to_csv(worksheet).split("\n").slice(0, 30).join("\n");
      } else {
        csvSample = (fileContents[0] as string).split("\n").slice(0, 30).join("\n");
      }

      toast.info("IA analisando colunas da planilha...");

      const { data, error } = await supabase.functions.invoke("detect-column-mapping", {
        body: { csvSample, fileName: files[0].name },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Erro na detecção");
      }

      const detected = data.mapping;
      // Apply detected mapping (filter out nulls)
      const newMapping: ColumnMapping = {
        employeeId: detected.employeeId || "",
        employeeName: detected.employeeName || "",
        date: detected.date || "",
        punch1: detected.punch1 || "",
        punch2: detected.punch2 || "",
        punch3: detected.punch3 || "",
        punch4: detected.punch4 || "",
        punch5: detected.punch5 || "",
        punch6: detected.punch6 || "",
        punch7: detected.punch7 || "",
        punch8: detected.punch8 || "",
      };
      setMapping(newMapping);

      const confidence = detected.confidence === "alta" ? "✅ Alta" : detected.confidence === "média" ? "⚠️ Média" : "❗ Baixa";
      toast.success(`Colunas detectadas! Confiança: ${confidence}${detected.notes ? ` — ${detected.notes}` : ""}`);

      // Auto-open save dialog to encourage saving as template
      setTemplateName("Padrão " + (files[0].name.split(".")[0] || "Empresa"));
      setSetAsDefault(true);
      setShowSaveTemplateDialog(true);
    } catch (err: any) {
      toast.error(`Erro ao detectar colunas: ${err.message}`);
    } finally {
      setIsDetectingColumns(false);
    }
  };

  const handleFileSelect = useCallback(async (selectedFiles: FileList | File[]) => {
    const newFiles = Array.from(selectedFiles);
    setFiles(prev => [...prev, ...newFiles]);

    try {
      const newContents: Array<ArrayBuffer | string> = [];

      for (const file of newFiles) {
        if (fileFormat === "pdf" || fileFormat === "excel") {
          const buffer = await file.arrayBuffer();
          newContents.push(buffer);
          if (fileFormat === "pdf") setUseAI(true);
        } else {
          const text = await file.text();
          newContents.push(text);
        }
      }

      setFileContents(prev => [...prev, ...newContents]);

      if (fileFormat !== "pdf") {
        // Just use the first file for header detection for now
        if (fileFormat === "excel") {
          const headers = await getExcelHeaders(newContents[0] as ArrayBuffer);
          setHeaders(headers);
        } else {
          const headers = await getCsvHeaders(newContents[0] as string);
          setHeaders(headers);
        }
        // Auto-apply default template if available after headers are set
        if (defaultTemplate) {
          setMapping(defaultTemplate.mapping);
          toast.info(`Modelo "${defaultTemplate.name}" aplicado automaticamente`);
        }
        setStep("mapping");
      } else {
        setStep("mapping");
      }
    } catch (err: any) {
      toast.error(`Erro ao ler arquivo: ${err.message}`);
    }
  }, [fileFormat, defaultTemplate]);

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Digite um nome para o modelo");
      return;
    }
    await saveTemplate(templateName.trim(), mapping, setAsDefault);
    setShowSaveTemplateDialog(false);
    setTemplateName("");
    setSetAsDefault(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleParse = async () => {
    if (files.length === 0 || fileContents.length === 0) return;
    setIsAIParsing(true);

    try {
      let aggregatedResult: ParseResult = {
        success: true,
        sourceName: files.map(f => f.name).join(", "),
        documentType: 'hybrid',
        records: [],
        accumulatedRecords: [],
        errors: [],
        totalRows: 0
      };

      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        const currentContent = fileContents[i];

        let result: ParseResult;

        if (useAI || fileFormat === "pdf") {
          toast.info(`Processando "${currentFile.name}" com IA...`);

          let aiContent = "";
          if (fileFormat === "pdf") {
            // Clone the buffer to prevent "detached ArrayBuffer" error on reuse
            const buffer = (currentContent as ArrayBuffer).slice(0);
            aiContent = await extractPDFText(buffer);
          } else if (fileFormat === "excel") {
            const { utils, read } = await import("xlsx");
            const workbook = read(currentContent as ArrayBuffer, { type: "array" });
            aiContent = workbook.SheetNames.map(name => {
              const sheet = workbook.Sheets[name];
              const rows = utils.sheet_to_json<any[]>(sheet, { header: 1 });
              const filteredRows = rows.map((row: any[]) =>
                row.filter((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== "")
              ).filter(row => row.length > 0);
              return `--- ABA: ${name} ---\n${filteredRows.map(row => row.join(",")).join("\n")}`;
            }).join("\n\n");
          } else {
            aiContent = currentContent as string;
          }

          console.log(`[DEBUG] Conteúdo extraído para IA de "${currentFile.name}" (primeiros 15000 chars):`, aiContent.substring(0, 15000));

          const { data, error } = await supabase.functions.invoke("parse-time-document", {
            body: {
              fileContent: aiContent.substring(0, 100000),
              fileName: currentFile.name,
              fileType: fileFormat,
            },
          });

          if (error) throw error;
          result = data as ParseResult;

          if (!result.success) {
            throw new Error(result.error || result.errors?.[0]?.message || `Falha no parsing de ${currentFile.name}`);
          }

          if (result.records?.length === 0 && result.accumulatedRecords?.length > 0) {
            console.warn(`IA retornou apenas acumulados para "${currentFile.name}":`, JSON.stringify(result, null, 2));
            toast.warning(`A IA não extraiu os pontos diários de "${currentFile.name}". Verifique se o formato é legível.`);
          } else {
            console.log(`Parsing concluído para "${currentFile.name}":`, result);
          }
        } else {
          result = fileFormat === "excel"
            ? await parseExcel(currentContent as ArrayBuffer, mapping)
            : await parseCsv(currentContent as string, mapping);
        }

        // Merge results
        aggregatedResult.records = [...aggregatedResult.records, ...(result.records || [])];
        aggregatedResult.accumulatedRecords = [...(aggregatedResult.accumulatedRecords || []), ...(result.accumulatedRecords || [])];
        aggregatedResult.errors = [...aggregatedResult.errors, ...(result.errors || [])];
        aggregatedResult.totalRows += result.totalRows || (result.records?.length || 0);
      }

      setParseResult(aggregatedResult);
      setStep("preview");
      toast.success(`Identificados ${aggregatedResult.totalRows} registros no total.`);
    } catch (error: any) {
      console.error('Parsing error:', error);
      toast.error(`Erro no processamento: ${error.message}`);
    } finally {
      setIsAIParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult || !companyId) return;

    // Determine if we need to perform hybrid, accumulated or just daily import
    const hasRecords = parseResult.records && parseResult.records.length > 0;
    const hasAccumulated = parseResult.accumulatedRecords && parseResult.accumulatedRecords.length > 0;

    setStep("importing");
    setImportProgress(0);

    try {
      let importedDaily = 0;
      let importedAccumulated = 0;

      // 1. Process Daily Records if present AND mode is time-tracking
      if (hasRecords && mode === 'time-tracking') {
        const dailyResult = await performDailyImport();
        importedDaily = dailyResult.imported;
      }

      // 2. Process Accumulated Records if present AND mode is absenteeism
      if (hasAccumulated && mode === 'absenteeism') {
        const accumulatedResult = await performAccumulatedImport();
        importedAccumulated = accumulatedResult.imported;
      }

      setImportResult({
        imported: importedDaily + importedAccumulated,
        failed: 0
      });
      setStep("complete");

      const parts = [];
      if (importedDaily > 0) parts.push(`${importedDaily} batidas`);
      if (importedAccumulated > 0) parts.push(`${importedAccumulated} resumos`);
      toast.success(`Importação concluída: ${parts.join(" e ")}.`);
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
      setStep("preview");
    }
  };

  const performDailyImport = async () => {
    if (!parseResult) return { imported: 0, failed: 0 };

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from("time_tracking_imports")
      .insert({
        company_id: companyId,
        source_type: fileFormat === "pdf" ? "pdf" : fileFormat,
        source_name: files.map(f => f.name).join(", "),
        total_records: parseResult.records.length,
        status: "processing",
        column_mapping: (useAI ? { ai_parsed: true } : mapping) as unknown as Json,
      })
      .select()
      .single();

    if (importError) throw importError;

    let imported = 0;
    let skipped = 0;
    const records = parseResult.records;
    const distinctDates = [...new Set(records.map(r => r.date).filter(Boolean))];

    const { data: existingRecords } = await supabase
      .from("time_tracking_records")
      .select("employee_id, external_employee_id, record_date")
      .eq("company_id", companyId)
      .in("record_date", distinctDates);

    const existingEmpSet = new Set(existingRecords?.filter(r => r.employee_id).map(r => `${r.employee_id}_${r.record_date}`));
    const existingExtSet = new Set(existingRecords?.filter(r => r.external_employee_id).map(r => `${r.external_employee_id}_${r.record_date}`));

    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const insertData = batch.map((record) => {
        let matchedEmployeeId = null;
        const byId = employees.find(e => {
          if (!e.external_id) return false;
          const extId = String(e.external_id).trim().replace(/^0+/, '');
          const recordId = String(record.externalEmployeeId).trim().replace(/^0+/, '');
          return extId === recordId;
        });
        if (byId) matchedEmployeeId = byId.id;
        else {
          const nameToSearch = record.employeeName || record.externalEmployeeId;
          if (nameToSearch && typeof nameToSearch === 'string') {
            const normalizedSearch = nameToSearch.toLowerCase().trim();
            const byName = employees.find(e => e.name.toLowerCase().trim() === normalizedSearch);
            if (byName) matchedEmployeeId = byName.id;
          }
        }

        const isDuplicate = matchedEmployeeId
          ? existingEmpSet.has(`${matchedEmployeeId}_${record.date}`)
          : existingExtSet.has(`${record.externalEmployeeId}_${record.date}`);

        if (isDuplicate) {
          skipped++;
          return null;
        }

        // --- NOTIFICAÇÃO DE BATIDA AUSENTE ---
        if (matchedEmployeeId && (!record.punches[0] || record.punches[0].trim() === "")) {
          notifyClock({
            recipientId: matchedEmployeeId,
            type: "justification_required",
            data: { data: record.date, descricao: "Ponto de entrada não registrado no arquivo importado." }
          });
        }

        return {
          company_id: companyId,
          import_id: importRecord.id,
          external_employee_id: record.externalEmployeeId,
          employee_id: matchedEmployeeId,
          record_date: record.date,
          entry_1: record.punches[0] || null,
          exit_1: record.punches[1] || null,
          entry_2: record.punches[2] || null,
          exit_2: record.punches[3] || null,
          entry_3: record.punches[4] || null,
          exit_3: record.punches[5] || null,
          entry_4: record.punches[6] || null,
          exit_4: record.punches[7] || null,
          raw_data: record.rawData as Json,
          status: matchedEmployeeId ? "imported" : "pending_link",
        };
      }).filter(Boolean);

      if (insertData.length > 0) {
        const { error: batchError } = await supabase.from("time_tracking_records").insert(insertData as any);
        if (!batchError) imported += insertData.length;
      }
      setImportProgress(Math.round(((i + batch.length) / records.length) * 50));
    }

    // --- DETECÇÃO DE FALTAS (FUNCIONÁRIOS ATIVOS SEM REGISTRO NO DIA) ---
    const activeEmployees = employees.filter(e => e.role === 'colaborador' || e.role === 'gestor');
    for (const date of distinctDates) {
      const presentEmployeeIdsForDate = new Set(
        records.filter(r => r.date === date).map(r => {
          const matched = employees.find(e => e.external_id === String(r.externalEmployeeId) || e.name === r.employeeName);
          return matched?.id;
        }).filter(Boolean)
      );

      const missingEmployees = activeEmployees.filter(e => !presentEmployeeIdsForDate.has(e.id));

      if (missingEmployees.length > 0) {
        const absenceRecords = missingEmployees.map(m => ({
          company_id: companyId,
          import_id: importRecord.id,
          employee_id: m.id,
          record_date: date,
          raw_data: { generated_absence: true },
          status: "imported"
        }));
        await supabase.from("time_tracking_records").insert(absenceRecords as any);

        // Notificar funcionários faltantes
        for (const m of missingEmployees) {
          notifyClock({
            recipientId: m.id,
            type: "justification_required",
            data: { data: date, descricao: "Ausência de registro de ponto nesta data." }
          });
        }
      }
    }

    await supabase.from("time_tracking_imports").update({
      status: "completed",
      imported_records: imported,
      completed_at: new Date().toISOString(),
    }).eq("id", importRecord.id);

    if (skipped > 0) {
      toast.info(`${skipped} registros já existiam e foram pulados.`);
    }

    return { imported, failed: 0 };
  };

  const performAccumulatedImport = async () => {
    if (!parseResult || !parseResult.accumulatedRecords) return { imported: 0, failed: 0 };

    const { data: reportRow, error: reportErr } = await supabase
      .from('absenteeism_reports')
      .insert({
        company_id: companyId,
        period_start: parseResult.periodStart || null,
        period_end: parseResult.periodEnd || null,
        company_name: parseResult.companyName || null,
        imported_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select('id')
      .single();

    if (reportErr) throw reportErr;

    const parseHoursToNumber = (h: string): number => {
      if (!h || h === '-') return 0;
      const parts = h.replace('-', '').trim().split(':');
      const total = parseInt(parts[0] || '0') + parseInt(parts[1] || '0') / 60;
      return h.startsWith('-') ? -total : total;
    };

    const records = parseResult.accumulatedRecords.map(r => {
      const predicted = parseHoursToNumber(r.predictedHours);
      const worked = parseHoursToNumber(r.workedHours);
      const absRate = predicted > 0 ? Math.max(0, ((predicted - worked) / predicted) * 100) : 0;
      return {
        report_id: reportRow.id,
        employee_name: r.employeeName,
        predicted_hours: r.predictedHours || null,
        worked_hours: r.workedHours || null,
        bonus_hours: r.bonusHours || null,
        balance: r.balance || null,
        absenteeism_rate: parseFloat(absRate.toFixed(2)),
      };
    });

    const { error: recErr } = await supabase.from('absenteeism_records').insert(records);
    if (recErr) throw recErr;

    setImportProgress(100);
    return { imported: records.length, failed: 0 };
  };

  const getAcceptedFormats = () => {
    switch (fileFormat) {
      case "excel": return ".xlsx,.xls";
      case "csv": return ".csv";
      case "pdf": return ".pdf";
      default: return ".xlsx,.xls,.csv,.pdf";
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importar Registros de Ponto
          {(useAI || fileFormat === "pdf") && (
            <Badge className="ml-2 bg-purple-100 text-purple-700">
              <Brain className="w-3 h-3 mr-1" />
              Com IA
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {step === "upload" && (mode === 'time-tracking' ? "Selecione os arquivos de batidas diárias" : "Selecione os arquivos de relatório acumulado")}
          {step === "mapping" && (useAI || fileFormat === "pdf" ? "Processamento inteligente com IA" : "Configure o mapeamento de colunas")}
          {step === "preview" && (mode === 'time-tracking' ? "Revise as batidas antes de importar" : "Revise o resumo antes de importar")}
          {step === "importing" && "Importando registros..."}
          {step === "complete" && "Importação concluída!"}
        </CardDescription>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mt-4">
          {["upload", "mapping", "preview", "complete"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === s
                  ? "bg-primary text-primary-foreground"
                  : ["upload", "mapping", "preview", "importing", "complete"].indexOf(step) > i
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
                  }`}
              >
                {i + 1}
              </div>
              {i < 3 && <div className="w-12 h-0.5 bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Formato do arquivo</Label>
                <Select value={fileFormat} onValueChange={(v) => {
                  setFileFormat(v as ExtendedFileFormat);
                  if (v === "pdf") setUseAI(true);
                }}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel (.xlsx, .xls)
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        CSV (.csv)
                      </div>
                    </SelectItem>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileType className="w-4 h-4" />
                        PDF (.pdf)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {fileFormat !== "pdf" && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={useAI}
                    onCheckedChange={setUseAI}
                    id="use-ai"
                  />
                  <Label htmlFor="use-ai" className="flex items-center gap-1 cursor-pointer">
                    <Brain className="w-4 h-4 text-purple-600" />
                    Usar IA para parsing inteligente
                  </Label>
                </div>
              )}
            </div>

            {useAI && (
              <Alert className="bg-purple-50 border-purple-200">
                <Brain className="w-4 h-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  A IA irá analisar automaticamente o documento e extrair os registros de ponto,
                  identificando colunas e formatos automaticamente.
                </AlertDescription>
              </Alert>
            )}

            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium">Arraste o arquivo aqui</p>
              <p className="text-sm text-gray-500 mt-1">ou clique para selecionar</p>
              <input
                id="file-input"
                type="file"
                multiple
                accept={getAcceptedFormats()}
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Step: Mapping */}
        {step === "mapping" && (
          <div className="space-y-6">
            <Alert>
              <FileSpreadsheet className="w-4 h-4" />
              <AlertDescription>
                Arquivos selecionados: <strong>{files.length}</strong>
                {!useAI && fileFormat !== "pdf" && ` — ${headers.length} colunas encontradas no primeiro arquivo`}
              </AlertDescription>
            </Alert>

            {(useAI || fileFormat === "pdf") ? (
              <div className="text-center py-8 space-y-4">
                {isAIParsing ? (
                  <>
                    <Brain className="w-16 h-16 mx-auto text-purple-600 animate-pulse" />
                    <p className="text-lg font-medium">Analisando documento com IA...</p>
                    <p className="text-sm text-muted-foreground">
                      A IA está identificando registros de ponto automaticamente
                    </p>
                  </>
                ) : (
                  <>
                    <Brain className="w-16 h-16 mx-auto text-purple-600" />
                    <p className="text-lg font-medium">Pronto para análise com IA</p>
                    <p className="text-sm text-muted-foreground">
                      Clique em "Processar com IA" para extrair os registros automaticamente
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Template selector + AI detect */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Save className="w-4 h-4 text-primary" />
                      Modelos salvos da empresa
                    </p>
                    {templates.length === 0 && (
                      <Alert className="py-2 px-3 flex-1">
                        <Brain className="w-4 h-4 text-purple-600" />
                        <AlertDescription className="text-xs text-muted-foreground">
                          Nenhum modelo salvo. Use a IA para detectar as colunas automaticamente e salve como modelo padrão.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  {templates.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {templates.map((tpl) => (
                        <div key={tpl.id} className="flex items-center gap-1 bg-background border rounded-full px-3 py-1">
                          {tpl.is_default && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                          <button
                            className="text-sm hover:text-primary transition-colors"
                            onClick={() => applyTemplate(tpl)}
                          >
                            {tpl.name}
                          </button>
                          <button
                            className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => deleteTemplate(tpl.id)}
                            title="Excluir modelo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDetectColumns}
                    disabled={isDetectingColumns}
                    className="w-full border-dashed border-purple-400 text-purple-700 hover:bg-purple-50"
                  >
                    {isDetectingColumns ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Detectando colunas com IA...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        🔍 Detectar colunas com IA e salvar como modelo
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ID do Funcionário *</Label>
                    <Select value={mapping.employeeId} onValueChange={(v) => setMapping({ ...mapping, employeeId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome do Funcionário</Label>
                    <Select
                      value={mapping.employeeName || "ignore"}
                      onValueChange={(v) => setMapping({ ...mapping, employeeName: v === "ignore" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ignore">Nenhum</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Select value={mapping.date} onValueChange={(v) => setMapping({ ...mapping, date: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Batidas (Entrada/Saída)</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <Select
                        key={n}
                        value={(mapping as any)[`punch${n}`] || "ignore"}
                        onValueChange={(v) => setMapping({ ...mapping, [`punch${n}`]: v === "ignore" ? "" : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Batida ${n}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ignore">Nenhum</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ))}
                  </div>
                </div>

                {/* Save template button */}
                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveTemplateDialog(true)}
                    disabled={!mapping.employeeId || !mapping.date}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar modelo da empresa
                  </Button>
                </div>
              </>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              {(useAI || fileFormat === "pdf") ? (
                <Button onClick={handleParse} disabled={isAIParsing}>
                  {isAIParsing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Processar com IA
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleParse} disabled={!mapping.employeeId || !mapping.date}>
                  Processar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Save Template Dialog */}
        <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="w-5 h-5 text-primary" />
                Salvar modelo de mapeamento
              </DialogTitle>
              <DialogDescription>
                Salve este mapeamento de colunas para reutilizar nas próximas importações sem precisar configurar novamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nome do modelo *</Label>
                <Input
                  id="template-name"
                  placeholder="Ex: Padrão Empresa, Folha Mensal..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="set-default"
                  checked={setAsDefault}
                  onCheckedChange={setSetAsDefault}
                />
                <Label htmlFor="set-default" className="flex items-center gap-1 cursor-pointer">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Definir como padrão (aplicar automaticamente)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Salvar modelo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Step: Preview */}
        {step === "preview" && parseResult && (
          <div className="space-y-6">
            <div className="flex gap-4">
              {parseResult.records.length > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {parseResult.records.length} batidas diárias
                </Badge>
              )}
              {parseResult.accumulatedRecords && parseResult.accumulatedRecords.length > 0 && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {parseResult.accumulatedRecords.length} resumos acumulados
                </Badge>
              )}
              {parseResult.errors.length > 0 && (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <XCircle className="w-4 h-4 mr-1" />
                  {parseResult.errors.length} erros
                </Badge>
              )}
              {(useAI || fileFormat === "pdf") && (
                <Badge variant="outline" className="text-purple-600 border-purple-600">
                  <Brain className="w-4 h-4 mr-1" />
                  Processado com IA
                </Badge>
              )}
            </div>

            <Tabs defaultValue={mode === 'time-tracking' ? "records" : "accumulated"}>
              <TabsList>
                {parseResult.records.length > 0 && (
                  <TabsTrigger value="records" className={mode !== 'time-tracking' ? "opacity-50" : ""}>
                    Batidas Diárias ({parseResult.records.length})
                  </TabsTrigger>
                )}
                {parseResult.accumulatedRecords && parseResult.accumulatedRecords.length > 0 && (
                  <TabsTrigger value="accumulated" className={mode !== 'absenteeism' ? "opacity-50" : ""}>
                    Resumo Acumulado ({parseResult.accumulatedRecords.length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="errors">Erros ({parseResult.errors.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="records">
                {parseResult.records.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Funcionário</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Batidas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parseResult.records.slice(0, 50).map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="font-medium">{r.employeeName || "---"}</div>
                              <div className="text-xs text-gray-500">ID: {r.externalEmployeeId}</div>
                            </TableCell>
                            <TableCell>{r.date}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {r.punches.map((p, pi) => (
                                  <Badge key={pi} variant="secondary" className="font-mono text-xs">
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">Nenhum registro diário encontrado.</div>
                )}
              </TabsContent>

              <TabsContent value="accumulated">
                {parseResult.accumulatedRecords && parseResult.accumulatedRecords.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead className="text-center">Previstas</TableHead>
                          <TableHead className="text-center">Trabalhadas</TableHead>
                          <TableHead className="text-center">Abonos</TableHead>
                          <TableHead className="text-center">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parseResult.accumulatedRecords.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{r.employeeName}</TableCell>
                            <TableCell className="text-center">{r.predictedHours}</TableCell>
                            <TableCell className="text-center">{r.workedHours}</TableCell>
                            <TableCell className="text-center">{r.bonusHours}</TableCell>
                            <TableCell className="text-center">
                              <span className={r.balance.startsWith('-') ? "text-destructive font-semibold" : "text-green-600 font-semibold"}>
                                {r.balance}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">Nenhum resumo acumulado encontrado.</div>
                )}
              </TabsContent>
              <TabsContent value="errors" className="max-h-64 overflow-auto">
                {parseResult.errors.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhum erro encontrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Linha</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.errors.slice(0, 20).map((error, i) => (
                        <TableRow key={i}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell className="text-red-600">{error.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={parseResult.totalRows === 0}
              >
                Importar {parseResult.totalRows} registros
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="space-y-6 text-center py-8">
            <RefreshCw className="w-12 h-12 mx-auto animate-spin text-primary" />
            <p className="text-lg font-medium">Importando registros...</p>
            <Progress value={importProgress} className="w-full" />
            <p className="text-sm text-gray-500">{importProgress}% concluído</p>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && importResult && (
          <div className="space-y-6 text-center py-8">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <p className="text-xl font-bold">Importação Concluída!</p>

            <div className="flex justify-center gap-4">
              <Badge className="bg-green-100 text-green-800 text-lg py-2 px-4">
                {importResult.imported} importados
              </Badge>
              {importResult.failed > 0 && (
                <Badge className="bg-red-100 text-red-800 text-lg py-2 px-4">
                  {importResult.failed} falharam
                </Badge>
              )}
            </div>

            <Button onClick={onComplete}>
              Concluir
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
