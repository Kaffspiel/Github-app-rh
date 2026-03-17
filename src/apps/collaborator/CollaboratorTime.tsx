import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, AlertCircle, RefreshCw, Play } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TimeRecord {
    id: string;
    record_date: string;
    entry_1: string | null;
    exit_1: string | null;
    entry_2: string | null;
    exit_2: string | null;
    entry_3: string | null;
    exit_3: string | null;
    entry_4: string | null;
    exit_4: string | null;
    status: string | null;
    anomalies: string[] | null;
}

interface CollaboratorTimeProps {
    timeRecords: TimeRecord[];
    isLoading: boolean;
    onRefresh: () => void;
    employeeId: string;
    companyId: string;
    skipTimeTracking: boolean;
}

export default function CollaboratorTime({ 
    timeRecords, 
    isLoading, 
    onRefresh,
    employeeId,
    companyId,
    skipTimeTracking
}: CollaboratorTimeProps) {
    const [isPunching, setIsPunching] = useState(false);

    const formatTime = (time: string | null) => {
        if (!time) return "--:--";
        return time.substring(0, 5);
    };

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case "normal": return "bg-green-100 text-green-700";
            case "delay": return "bg-orange-100 text-orange-700";
            case "absence": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const getStatusLabel = (status: string | null) => {
        switch (status) {
            case "normal": return "Normal";
            case "delay": return "Atraso";
            case "absence": return "Falta";
            case "imported": return "Importado";
            default: return status || "Pendente";
        }
    };

    const handlePunchClock = async () => {
        if (!employeeId || !companyId) {
            toast.error("Dados do colaborador não encontrados");
            return;
        }

        setIsPunching(true);
        try {
            const today = format(new Date(), "yyyy-MM-dd");
            const nowTime = format(new Date(), "HH:mm:ss");

            // Buscar registro de hoje
            const { data: existingRecord, error: fetchError } = await supabase
                .from("time_tracking_records")
                .select("*")
                .eq("employee_id", employeeId)
                .eq("record_date", today)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (existingRecord) {
                // Encontrar próxima batida disponível
                const punches = [
                    'entry_1', 'exit_1', 
                    'entry_2', 'exit_2', 
                    'entry_3', 'exit_3', 
                    'entry_4', 'exit_4'
                ];
                
                const nextPunch = punches.find(p => !existingRecord[p]);

                if (!nextPunch) {
                    toast.warning("Todas as batidas de hoje já foram preenchidas!");
                    return;
                }

                const { error: updateError } = await supabase
                    .from("time_tracking_records")
                    .update({ [nextPunch]: nowTime })
                    .eq("id", existingRecord.id);

                if (updateError) throw updateError;
                toast.success(`Ponto registrado: ${nextPunch.replace('_', ' ')} às ${nowTime.substring(0, 5)}`);
            } else {
                // Criar novo registro
                const { error: insertError } = await supabase
                    .from("time_tracking_records")
                    .insert({
                        employee_id: employeeId,
                        company_id: companyId,
                        record_date: today,
                        entry_1: nowTime,
                        status: "normal"
                    });

                if (insertError) throw insertError;
                toast.success(`Ponto registrado: entrada 1 às ${nowTime.substring(0, 5)}`);
            }

            onRefresh();
        } catch (error: any) {
            console.error("Erro ao bater ponto:", error);
            toast.error(`Erro ao registrar ponto: ${error.message}`);
        } finally {
            setIsPunching(false);
        }
    };

    const todayRecord = timeRecords.find(r => r.record_date === format(new Date(), "yyyy-MM-dd"));

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Meu Ponto</h2>
                <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Punch Button Section */}
            <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none shadow-lg">
                <CardContent className="pt-6 pb-6 text-center space-y-4">
                    <div className="space-y-1">
                        <p className="text-blue-100 text-sm font-medium">Hora Atual</p>
                        <p className="text-4xl font-bold tracking-tighter">
                            {format(new Date(), "HH:mm")}
                        </p>
                        <p className="text-blue-200 text-xs">
                            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </p>
                    </div>

                    {skipTimeTracking && (
                        <div className="bg-white/10 border border-white/20 rounded-xl p-3 mb-4 flex items-start gap-3 text-left">
                            <AlertCircle className="w-5 h-5 text-blue-200 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold">Você é isento de ponto</p>
                                <p className="text-[10px] text-blue-100">Não é obrigatório registrar suas batidas, mas você pode usar o botão abaixo se desejar manter um controle pessoal.</p>
                            </div>
                        </div>
                    )}

                    <Button 
                        size="lg" 
                        className="w-full bg-white text-blue-700 hover:bg-blue-50 h-16 rounded-2xl shadow-xl transition-all active:scale-95 group"
                        onClick={handlePunchClock}
                        disabled={isPunching}
                    >
                        {isPunching ? (
                            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                        ) : (
                            <Play className="w-6 h-6 mr-2 fill-current group-hover:scale-110 transition-transform" />
                        )}
                        <span className="text-xl font-bold">BATER PONTO</span>
                    </Button>

                    <div className="grid grid-cols-4 gap-1 pt-2">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-blue-200 uppercase">E1</span>
                            <span className="text-xs font-semibold">{formatTime(todayRecord?.entry_1)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-blue-200 uppercase">S1</span>
                            <span className="text-xs font-semibold">{formatTime(todayRecord?.exit_1)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-blue-200 uppercase">E2</span>
                            <span className="text-xs font-semibold">{formatTime(todayRecord?.entry_2)}</span>
                        </div>
                        <div className="flex flex-col items-center text-blue-200/50">
                            <span className="text-[10px] uppercase">S2</span>
                            <span className="text-xs font-semibold">{formatTime(todayRecord?.exit_2)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Histórico Recente</h3>
            </div>

            {/* Records List */}
            <ScrollArea className="h-[calc(100vh-420px)]">
                <div className="space-y-3">
                    {timeRecords.length === 0 ? (
                        <Card className="border-dashed border-2 bg-gray-50/50">
                            <CardContent className="text-center py-12">
                                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">Nenhum registro encontrado</p>
                            </CardContent>
                        </Card>
                    ) : (
                        timeRecords.map((record) => (
                            <Card key={record.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${record.status === "normal" ? "bg-green-500" :
                                                record.status === "delay" ? "bg-orange-500" :
                                                    record.status === "absence" ? "bg-red-500" :
                                                        "bg-gray-400"
                                                }`} />
                                            <span className="font-semibold text-gray-800">
                                                {format(parseISO(record.record_date), "dd/MM - EEEE", { locale: ptBR })}
                                            </span>
                                        </div>
                                        <Badge variant="secondary" className={getStatusColor(record.status)}>
                                            {getStatusLabel(record.status)}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center text-[11px] bg-gray-50 rounded-lg p-2">
                                        <div>
                                            <p className="text-gray-400 uppercase">E1</p>
                                            <p className="font-bold text-gray-700">{formatTime(record.entry_1)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 uppercase">S1</p>
                                            <p className="font-bold text-gray-700">{formatTime(record.exit_1)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 uppercase">E2</p>
                                            <p className="font-bold text-gray-700">{formatTime(record.entry_2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 uppercase">S2</p>
                                            <p className="font-bold text-gray-700">{formatTime(record.exit_2)}</p>
                                        </div>
                                    </div>
                                    {record.anomalies && record.anomalies.length > 0 && (
                                        <div className="mt-2 flex items-center gap-1 text-orange-600 bg-orange-50 rounded px-2 py-0.5 w-fit">
                                            <AlertCircle className="w-3 h-3" />
                                            <span className="text-[10px] font-medium">{record.anomalies.join(", ")}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
