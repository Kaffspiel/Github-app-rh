import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { toast } from "sonner";
import { useEmployeesList } from "@/hooks/useEmployeesList";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Upload, FileSpreadsheet, FileText, CheckCircle2, XCircle,
  AlertTriangle, ArrowRight, Download, RefreshCw, Brain, FileType
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import {
  parseExcel, getExcelHeaders,
  parseCsv, getCsvHeaders,
  parsePDF, extractPDFText,
  type ParseResult, type ColumnMapping, type FileFormat, type ParsedTimeRecord
} from "@/services/timeImport";

interface ImportWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "complete";
type ExtendedFileFormat = FileFormat | "pdf";

export function ImportWizard({ onComplete, onCancel }: ImportWizardProps) {
  const { companyId } = useCompany();
  const { employees } = useEmployeesList();
  const { notify, notifyClock } = useNotifications();
  const [step, setStep] = useState<Step>("upload");
  const [fileFormat, setFileFormat] = useState<ExtendedFileFormat>("excel");
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<ArrayBuffer | string | null>(null);
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

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);

    try {
      // For PDF, always use AI
      if (fileFormat === "pdf") {
        setUseAI(true);
        const text = await selectedFile.text();
        setFileContent(text);
        // Skip mapping step for AI parsing - go directly to AI processing
        setStep("mapping");
        return;
      }

      if (fileFormat === "excel") {
        const buffer = await selectedFile.arrayBuffer();
        setFileContent(buffer);
        const hdrs = getExcelHeaders(buffer);
        setHeaders(hdrs);
      } else {
        const text = await selectedFile.text();
        setFileContent(text);
        const hdrs = getCsvHeaders(text);
        setHeaders(hdrs);
      }
      setStep("mapping");
    } catch (error) {
      toast.error("Erro ao ler arquivo");
    }
  }, [fileFormat]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleAIParse = async () => {
    if (!file) return;

    setIsAIParsing(true);
    try {
      console.log('AI Parse started for format:', fileFormat);
      // Read file content for AI
      let content: string;
      if (fileFormat === "excel") {
        // For Excel, convert to text representation
        const buffer = await file.arrayBuffer();
        const { utils, read } = await import("xlsx");
        const workbook = read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        content = utils.sheet_to_csv(worksheet);
      } else if (fileFormat === "pdf") {
        // For PDF, extract text using PDF.js before sending to AI
        const buffer = await file.arrayBuffer();
        content = await extractPDFText(buffer);
      } else {
        content = await file.text();
      }

      console.log('Document content extracted, length:', content.length);
      console.log('Content preview:', content.substring(0, 500) + '...');

      toast.info("Analisando documento com IA...");

      const { data, error } = await supabase.functions.invoke('parse-time-document', {
        body: {
          fileContent: content.substring(0, 40000),
          fileType: fileFormat,
          fileName: file.name,
        },
      });

      console.log('Supabase function response received:', { data, error });

      if (error) {
        console.error('Functions invoke error:', error);
        throw new Error(error.message || 'Falha na comunicação com a Edge Function');
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha no parsing com IA');
      }

      // Convert AI result to ParseResult format
      const result: ParseResult = {
        success: true,
        records: data.records.map((r: ParsedTimeRecord) => ({
          externalEmployeeId: r.externalEmployeeId,
          employeeName: r.employeeName,
          date: r.date,
          punches: r.punches || [],
        })),
        errors: data.errors || [],
        totalRows: data.records.length,
      };

      setParseResult(result);
      setStep("preview");
      toast.success(`IA identificou ${result.records.length} registros`);

    } catch (error: any) {
      console.error('AI parsing error:', error);
      toast.error(`Erro no parsing com IA: ${error.message}`);
    } finally {
      setIsAIParsing(false);
    }
  };

  const handleParse = () => {
    // If using AI, use AI parsing
    if (useAI) {
      handleAIParse();
      return;
    }

    if (!fileContent) {
      toast.error("Erro ao ler arquivo");
      return;
    }

    let result: ParseResult | Promise<ParseResult>;

    if (fileFormat === "excel") {
      result = parseExcel(fileContent as ArrayBuffer, mapping);
    } else if (fileFormat === "pdf") {
      // Standard PDF parsing (heuristic)
      toast.info("Processando PDF...");
      // Wrap async result for unified handling
      parsePDF(fileContent as ArrayBuffer).then(res => {
        setParseResult(res);
        setStep("preview");
      }).catch(err => {
        toast.error("Erro ao processar PDF");
        console.error(err);
      });
      return;
    } else {
      if (!mapping.employeeId || !mapping.date) {
        toast.error("Configure o mapeamento obrigatório");
        return;
      }
      result = parseCsv(fileContent as string, mapping);
    }

    // For sync results (Excel/CSV)
    setParseResult(result as ParseResult);
    setStep("preview");
  };

  const handleImport = async () => {
    if (!parseResult || !companyId) return;

    setStep("importing");
    setImportProgress(0);

    try {
      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from("time_tracking_imports")
        .insert({
          company_id: companyId,
          source_type: fileFormat === "pdf" ? "pdf" : fileFormat,
          source_name: file?.name,
          total_records: parseResult.records.length,
          status: "processing",
          column_mapping: (useAI ? { ai_parsed: true } : mapping) as unknown as Json,
        })
        .select()
        .single();

      if (importError) throw importError;

      let imported = 0;
      let failed = 0;
      const batchSize = 50;
      const records = parseResult.records;

      // PREVENT DUPLICATES: Fetch existing records for better filtering
      const distinctDates = [...new Set(records.map(r => r.date).filter(Boolean))];

      // We'll fetch in chunks if there are too many dates, but usually it's one month (30 dates)
      const { data: existingRecords } = await supabase
        .from("time_tracking_records")
        .select("employee_id, external_employee_id, record_date")
        .eq("company_id", companyId)
        .in("record_date", distinctDates);

      // Create lookup sets
      const existingEmpSet = new Set(
        existingRecords
          ?.filter(r => r.employee_id)
          .map(r => `${r.employee_id}_${r.record_date}`)
      );

      const existingExtSet = new Set(
        existingRecords
          ?.filter(r => r.external_employee_id)
          .map(r => `${r.external_employee_id}_${r.record_date}`)
      );

      let skippedDuplicates = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        const insertData = batch.map((record) => {
          // Try to link to an employee
          let matchedEmployeeId = null;

          if (employees.length > 0) {
            // 1. Try exact match on external_id
            const byId = employees.find(e => e.external_id && e.external_id === String(record.externalEmployeeId));
            if (byId) {
              matchedEmployeeId = byId.id;
            } else {
              // 2. Try match on Name (case insensitive)
              // Use record.employeeName if available, otherwise record.externalEmployeeId might actually be a name (for PDF reports)
              const nameToSearch = record.employeeName || record.externalEmployeeId;
              if (nameToSearch && typeof nameToSearch === 'string') {
                const normalizedSearch = nameToSearch.toLowerCase().trim();
                const byName = employees.find(e => e.name.toLowerCase().trim() === normalizedSearch);
                if (byName) matchedEmployeeId = byName.id;
              }
            }
          }


          // Check for duplication
          const isDuplicate = matchedEmployeeId
            ? existingEmpSet.has(`${matchedEmployeeId}_${record.date}`)
            : existingExtSet.has(`${record.externalEmployeeId}_${record.date}`);

          if (isDuplicate) {
            return null; // Will filter this out
          }

          return {
            company_id: companyId,
            import_id: importRecord.id,
            external_employee_id: record.externalEmployeeId,
            employee_id: matchedEmployeeId, // Added linkage
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
            status: matchedEmployeeId ? "imported" : "pending_link", // Optional status update
          };
        }).filter(Boolean); // Filter out nulls (duplicates)

        // SEND NOTIFICATIONS FOR MISSING PUNCHES
        for (const record of batch) {
          let matchedEmployeeId = null;
          if (employees.length > 0) {
            const byId = employees.find(e => e.external_id && e.external_id === String(record.externalEmployeeId));
            if (byId) {
              matchedEmployeeId = byId.id;
            } else {
              const nameToSearch = record.employeeName || record.externalEmployeeId;
              if (nameToSearch && typeof nameToSearch === 'string') {
                const normalizedSearch = nameToSearch.toLowerCase().trim();
                const byName = employees.find(e => e.name.toLowerCase().trim() === normalizedSearch);
                if (byName) matchedEmployeeId = byName.id;
              }
            }
          }

          const hasMissingEntry = !record.punches[0] || record.punches[0].trim() === "";

          if (matchedEmployeeId && hasMissingEntry) {
            // 1. Notify Collaborator
            notifyClock({
              recipientId: matchedEmployeeId,
              type: "justification_required",
              data: {
                data: record.date,
                descricao: "Ponto de entrada não registrado no arquivo importado."
              }
            });

            // 2. Notify Managers
            const managers = employees.filter(e => e.role === 'admin' || e.role === 'gestor');
            managers.forEach(manager => {
              notify({
                type: "manager_missing_punch",
                recipientId: manager.id,
                variables: {
                  colaborador: record.employeeName || record.externalEmployeeId || "Colaborador",
                  data: record.date
                }
              });
            });
          }
        }

        if (insertData.length > 0) {
          const { error: batchError } = await supabase
            .from("time_tracking_records")
            .insert(insertData as any); // Cast to any to avoid strict type issues with filtered array

          if (batchError) {
            failed += batch.length; // Count full batch as failed if insert fails needed? or just the ones we tried
            console.error("Batch error:", batchError);
          } else {
            imported += insertData.length;
          }
        }

        skippedDuplicates += (batch.length - insertData.length);


        setImportProgress(Math.round(((i + batch.length) / records.length) * 100));
      }

      if (skippedDuplicates > 0) {
        toast.info(`${skippedDuplicates} registros duplicados foram ignorados.`);
      }

      // Update import record
      await supabase
        .from("time_tracking_imports")
        .update({
          status: failed === 0 ? "completed" : "partial",
          imported_records: imported,
          failed_records: failed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", importRecord.id);

      // --- NEW: DETECT MISSING EMPLOYEES (ROWS) ---
      // The user specified that some reports only show who clocked in.
      // We need to match existing active employees against the imported dates.

      // distinctDates already exists from outer scope
      const activeEmployees = employees.filter(e => e.role === 'colaborador' || e.role === 'gestor'); // Assuming admins don't punch clock? Or everyone? Let's stick to active employees from the list. 
      // Actually useEmployeesList returns "is_active" filtered already in the hook usually, but let's be safe if logic changes.
      // The hook source showed .eq('is_active', true). so 'employees' are all active.

      for (const date of distinctDates) {
        // 1. Identify who IS in the import for this date
        const presentEmployeeIds = new Set<string>();

        // We need to resolve records to employee IDs again (or reuse some map if optimization needed, but this is fine for now)
        records.forEach(r => {
          if (r.date !== date) return;

          let eId = null;
          // Try exact match external
          const byId = employees.find(e => e.external_id && e.external_id === String(r.externalEmployeeId));
          if (byId) {
            eId = byId.id;
          } else {
            // Try match name
            const nameToSearch = r.employeeName || r.externalEmployeeId;
            if (nameToSearch && typeof nameToSearch === 'string') {
              const normalizedSearch = nameToSearch.toLowerCase().trim();
              const byName = employees.find(e => e.name.toLowerCase().trim() === normalizedSearch);
              if (byName) eId = byName.id;
            }
          }
          if (eId) presentEmployeeIds.add(eId);
        });

        // 2. Find who is MISSING
        const missingEmployees = activeEmployees.filter(e => !presentEmployeeIds.has(e.id));

        // 3. Notify Missing Employees AND Create Absence Records
        const absenceRecords = missingEmployees.map(missingEmp => ({
          company_id: companyId,
          import_id: importRecord.id,
          employee_id: missingEmp.id,
          // external_employee_id: missingEmp.external_id, // Optional
          record_date: date,
          entry_1: null,
          exit_1: null,
          entry_2: null,
          exit_2: null,
          entry_3: null,
          exit_3: null,
          entry_4: null,
          exit_4: null,
          raw_data: { generated_absence: true },
          status: "imported"
        }));

        if (absenceRecords.length > 0) {
          const { error: absenceError } = await supabase
            .from("time_tracking_records")
            .insert(absenceRecords as any);

          if (absenceError) {
            console.error("Error creating absence records:", absenceError);
            toast.error(`Erro ao criar registros de falta para ${date}`);
          } else {
            // Count these as imported/processed?
            // imported += absenceRecords.length; // Optional: user might confusing seeing more imported records than rows in file. 
            // Let's Log it.
            console.log(`Created ${absenceRecords.length} absence records for ${date}`);
          }
        }

        for (const missingEmp of missingEmployees) {
          // Notify Collaborator
          notifyClock({
            recipientId: missingEmp.id,
            type: "justification_required",
            data: {
              data: date,
              descricao: "Ausência de registro de ponto nesta data."
            }
          });

          // Notify Managers
          const managers = employees.filter(e => e.role === 'admin' || e.role === 'gestor');
          managers.forEach(manager => {
            notify({
              type: "manager_missing_punch",
              recipientId: manager.id,
              variables: {
                colaborador: missingEmp.name,
                data: date
              }
            });
          });
        }

        if (missingEmployees.length > 0) {
          console.log(`[Import] Date ${date}: ${missingEmployees.length} missing employees notified.`);
        }
      }

      setImportResult({ imported, failed });
      setStep("complete");
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
      setStep("preview");
    }
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
          {step === "upload" && "Selecione o arquivo para importar"}
          {step === "mapping" && (useAI || fileFormat === "pdf" ? "Processamento com IA" : "Configure o mapeamento de colunas")}
          {step === "preview" && "Revise os dados antes de importar"}
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
                accept={getAcceptedFormats()}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
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
                Arquivo: <strong>{file?.name}</strong>
                {!useAI && fileFormat !== "pdf" && ` - ${headers.length} colunas encontradas`}
              </AlertDescription>
            </Alert>

            {(useAI || fileFormat === "pdf") ? (
              <div className="text-center py-8 space-y-4">
                {isAIParsing ? (
                  <>
                    <Brain className="w-16 h-16 mx-auto text-purple-600 animate-pulse" />
                    <p className="text-lg font-medium">Analisando documento com IA...</p>
                    <p className="text-sm text-gray-500">
                      A IA está identificando registros de ponto automaticamente
                    </p>
                  </>
                ) : (
                  <>
                    <Brain className="w-16 h-16 mx-auto text-purple-600" />
                    <p className="text-lg font-medium">Pronto para análise com IA</p>
                    <p className="text-sm text-gray-500">
                      Clique em "Processar com IA" para extrair os registros automaticamente
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
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

        {/* Step: Preview */}
        {step === "preview" && parseResult && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {parseResult.records.length} registros válidos
              </Badge>
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

            <Tabs defaultValue="records">
              <TabsList>
                <TabsTrigger value="records">Registros ({parseResult.records.length})</TabsTrigger>
                <TabsTrigger value="errors">Erros ({parseResult.errors.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="records" className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Func.</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Batidas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.records.slice(0, 20).map((record, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{record.externalEmployeeId}</TableCell>
                        <TableCell>{record.employeeName || "-"}</TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.punches.join(", ") || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parseResult.records.length > 20 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Mostrando 20 de {parseResult.records.length} registros
                  </p>
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
              <Button onClick={handleImport} disabled={parseResult.records.length === 0}>
                Importar {parseResult.records.length} registros
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
