import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimeRecord {
    id: string;
    record_date: string;
    entry_1: string | null;
    exit_1: string | null;
    entry_2: string | null;
    exit_2: string | null;
    status: string | null;
    anomalies: string[] | null;
}

interface CollaboratorTimeProps {
    timeRecords: TimeRecord[];
    isLoading: boolean;
    onRefresh: () => void;
}

export default function CollaboratorTime({ timeRecords, isLoading, onRefresh }: CollaboratorTimeProps) {

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

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Histórico de Ponto</h2>
                <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Current Month Summary */}
            <Card className="bg-gradient-to-r from-slate-800 to-slate-700 text-white border-none">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-300 text-sm">
                                {format(new Date(), "MMMM yyyy", { locale: ptBR })}
                            </p>
                            <p className="text-2xl font-bold">{timeRecords.length} registros</p>
                        </div>
                        <Calendar className="w-10 h-10 text-slate-400" />
                    </div>
                </CardContent>
            </Card>

            {/* Records List */}
            <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2">
                    {timeRecords.length === 0 ? (
                        <Card>
                            <CardContent className="text-center py-12">
                                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">Nenhum registro encontrado</p>
                            </CardContent>
                        </Card>
                    ) : (
                        timeRecords.map((record) => (
                            <Card key={record.id} className="overflow-hidden">
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${record.status === "normal" ? "bg-green-500" :
                                                record.status === "delay" ? "bg-orange-500" :
                                                    record.status === "absence" ? "bg-red-500" :
                                                        "bg-gray-400"
                                                }`} />
                                            <span className="font-medium">
                                                {format(parseISO(record.record_date), "EEEE, d", { locale: ptBR })}
                                            </span>
                                        </div>
                                        <Badge variant="outline" className={getStatusColor(record.status)}>
                                            {getStatusLabel(record.status)}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 text-center text-xs">
                                        <div>
                                            <p className="text-gray-400">E1</p>
                                            <p className="font-mono">{formatTime(record.entry_1)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">S1</p>
                                            <p className="font-mono">{formatTime(record.exit_1)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">E2</p>
                                            <p className="font-mono">{formatTime(record.entry_2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">S2</p>
                                            <p className="font-mono">{formatTime(record.exit_2)}</p>
                                        </div>
                                    </div>
                                    {record.anomalies && record.anomalies.length > 0 && (
                                        <div className="mt-2 flex items-center gap-1 text-orange-600">
                                            <AlertCircle className="w-3 h-3" />
                                            <span className="text-xs">{record.anomalies.join(", ")}</span>
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
