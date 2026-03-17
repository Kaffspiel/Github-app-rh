import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, Trophy, Calendar, CheckCircle, XCircle, Medal, FileUp, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Occurrence {
    id: string;
    type: string;
    points: number;
    description: string;
    file_url?: string;
    created_at: string;
}

interface RankingItem {
    employee_id: string;
    name: string;
    total_score: number;
    ranking: number;
}

export default function CollaboratorOccurrences() {
    const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
    const [ranking, setRanking] = useState<RankingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPoints, setTotalPoints] = useState(0);
    const { user } = useAuth();
    const [employeeId, setEmployeeId] = useState<string | null>(null);
    const [companyId, setCompanyId] = useState<string | null>(null);

    // Form state for medical certificate
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [certificateDescription, setCertificateDescription] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            // 1. Get Employee info
            const { data: employee } = await supabase
                .from("employees")
                .select("id, company_id")
                .eq("user_id", user?.id)
                .single();

            if (!employee) return;
            setEmployeeId(employee.id);
            setCompanyId(employee.company_id);

            // 2. Fetch Occurrences for this employee
            const { data, error } = await supabase
                .from("occurrences")
                .select("*")
                .eq("employee_id", employee.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (data) {
                setOccurrences(data);
                const total = data.reduce((acc, curr) => acc + (curr.points || 0), 0);
                setTotalPoints(total);
            }

            // 3. Fetch Ranking
            const { data: rankingData, error: rankingError } = await supabase
                .rpc('get_company_ranking' as any);

            if (rankingError) {
                console.error("Error fetching ranking:", rankingError);
            } else if (rankingData) {
                setRanking(rankingData as RankingItem[]);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmitCertificate = async () => {
        if (!selectedFile || !employeeId || !companyId) {
            toast.error("Por favor, selecione uma foto do atestado.");
            return;
        }

        setUploading(true);
        try {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${employeeId}/${Date.now()}.${fileExt}`;
            const filePath = `certificates/${fileName}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('atestos' as any) // Assuming 'atestos' bucket exists, or will use public if needed
                .upload(filePath, selectedFile);

            if (uploadError) {
                // Fallback attempt with 'documents' bucket if 'atestos' fails
                const { error: fallbackError } = await supabase.storage
                    .from('documents' as any)
                    .upload(filePath, selectedFile);
                
                if (fallbackError) throw fallbackError;
            }

            const { data: urlData } = supabase.storage
                .from('atestos' as any)
                .getPublicUrl(filePath);

            // 2. Create Occurrence Record
            const { error: occError } = await supabase
                .from("occurrences")
                .insert({
                    employee_id: employeeId,
                    company_id: companyId,
                    type: "atestado",
                    points: 0, // Atestado usually doesn't give or take points directly, it justifies a "falta"
                    description: certificateDescription || "Atestado médico enviado via mobile",
                    file_url: urlData.publicUrl
                });

            if (occError) throw occError;

            toast.success("Atestado enviado com sucesso! Nosso RH irá analisar.");
            setIsUploadOpen(false);
            setCertificateDescription("");
            setSelectedFile(null);
            fetchData();
        } catch (error: any) {
            console.error("Erro ao enviar atestado:", error);
            toast.error(`Erro ao enviar: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const getPointsColor = (points: number) => {
        return points > 0 ? "text-green-600" : "text-red-600";
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'aprovacao_tarefa': return "Tarefa Antecipada";
            case 'atraso_tarefa': return "Tarefa Atrasada";
            case 'falta': return "Falta";
            case 'atestado': return "Atestado";
            case 'pontualidade_positiva': return "Pontualidade (+)";
            case 'pontualidade_negativa': return "Atraso (-)";
            default: return type.replace(/_/g, " ");
        }
    };

    const getIcon = (type: string) => {
        if (type.includes('positiva') || type.includes('aprovacao')) return <CheckCircle className="w-5 h-5 text-green-500" />;
        if (type.includes('negativa') || type.includes('atraso') || type.includes('falta')) return <XCircle className="w-5 h-5 text-red-500" />;
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }

    const getMedalColor = (rank: number) => {
        switch (rank) {
            case 1: return "text-yellow-500";
            case 2: return "text-gray-400";
            case 3: return "text-orange-500";
            default: return "text-gray-300";
        }
    }

    if (loading) {
        return <div className="p-4 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>;
    }

    return (
        <div className="p-4 space-y-6 pb-20">
            <Tabs defaultValue="history" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="history">Meus Pontos</TabsTrigger>
                    <TabsTrigger value="ranking">Ranking</TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="space-y-6">
                    <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
                        <CardContent className="pt-6 text-center">
                            <div className="mb-2 flex justify-center">
                                <div className="p-3 bg-white/20 rounded-full">
                                    <Trophy className="w-8 h-8 text-yellow-300" />
                                </div>
                            </div>
                            <h2 className="text-lg font-medium text-indigo-100">Sua Pontuação Total</h2>
                            <div className="text-5xl font-bold mt-2">{totalPoints}</div>
                            <p className="text-sm text-indigo-200 mt-2">pontos acumulados</p>
                            
                            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                                <DialogTrigger asChild>
                                    <Button className="mt-4 bg-white text-indigo-600 hover:bg-white/90 gap-2 w-full rounded-xl">
                                        <FileUp className="w-4 h-4" />
                                        ENVIAR ATESTADO
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-[calc(100%-32px)] rounded-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Enviar Atestado Médico</DialogTitle>
                                        <DialogDescription>
                                            Tire uma foto nítida do seu atestado para justificar sua falta ou atraso.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-2">
                                        <div className="space-y-2">
                                            <Label>Descrição (opcional)</Label>
                                            <Input 
                                                placeholder="Ex: Consulta odontológica..." 
                                                value={certificateDescription}
                                                onChange={(e) => setCertificateDescription(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Selecionar Foto *</Label>
                                            <div className={`border-2 border-dashed rounded-xl p-6 text-center ${selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                                                <input
                                                    type="file"
                                                    id="atestado-input"
                                                    className="hidden"
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={handleFileUpload}
                                                />
                                                <label htmlFor="atestado-input" className="cursor-pointer flex flex-col items-center">
                                                    {selectedFile ? (
                                                        <>
                                                            <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                                                            <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                                                            <p className="text-xs text-green-600 mt-1">Toque para trocar</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-10 h-10 text-gray-400 mb-2" />
                                                            <p className="text-sm font-medium text-gray-700">Tirar Foto ou Escolher</p>
                                                            <p className="text-xs text-gray-500 mt-1">JPG, PNG até 5MB</p>
                                                        </>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter className="mt-4">
                                        <Button 
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12"
                                            onClick={handleSubmitCertificate}
                                            disabled={uploading || !selectedFile}
                                        >
                                            {uploading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ENVIANDO...
                                                </>
                                            ) : (
                                                "ENVIAR AGORA"
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Histórico
                        </h3>

                        {occurrences.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                                Nenhuma ocorrência registrada ainda.
                            </div>
                        ) : (
                            occurrences.map((occ) => (
                                <Card key={occ.id} className="overflow-hidden border-none shadow-sm">
                                    <div className={`h-1 w-full ${occ.points >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <CardContent className="p-4 flex items-start justify-between">
                                        <div className="flex gap-3">
                                            <div className="mt-1">
                                                {getIcon(occ.type)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 capitalize">{getTypeLabel(occ.type)}</h4>
                                                <p className="text-sm text-gray-600 mt-0.5">{occ.description}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <p className="text-xs text-gray-400">
                                                        {format(new Date(occ.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                                    </p>
                                                    {occ.file_url && (
                                                        <a 
                                                            href={occ.file_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium"
                                                        >
                                                            Ver Anexo
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`font-bold text-lg ${getPointsColor(occ.points)} whitespace-nowrap`}>
                                            {occ.points > 0 ? "+" : ""}{occ.points}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="ranking" className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 mb-6 pt-4">
                        {/* Podium logic: 2nd, 1st, 3rd */}
                        {[ranking[1], ranking[0], ranking[2]].map((item, idx) => {
                            if (!item) return null;
                            const isFirst = idx === 1; // Array index 1 is actually the 1st place in our mapping logic
                            return (
                                <div key={item.employee_id} className={`flex flex-col items-center ${isFirst ? '-mt-4' : ''}`}>
                                    <div className={`relative mb-2 ${isFirst ? 'w-20 h-20' : 'w-16 h-16'}`}>
                                        <Avatar className="w-full h-full border-4 border-white shadow-lg">
                                            <AvatarFallback className={`${isFirst ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'} font-bold text-xl`}>
                                                {item.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-full p-1 shadow">
                                            <Medal className={`w-4 h-4 ${getMedalColor(item.ranking)}`} fill="currentColor" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className={`font-bold text-sm ${item.employee_id === employeeId ? 'text-blue-600' : 'text-gray-800'}`}>
                                            {item.ranking}º
                                        </p>
                                        <p className="text-xs font-medium text-gray-600 line-clamp-1 w-20 text-center">{item.name}</p>
                                        <p className="font-bold text-sm text-gray-900">{item.total_score}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="space-y-2">
                        {ranking.slice(3).map((item) => (
                            <Card key={item.employee_id} className={`${item.employee_id === employeeId ? 'border-blue-500 bg-blue-50' : ''}`}>
                                <CardContent className="p-3 flex items-center gap-3">
                                    <span className="font-bold text-gray-500 w-6 text-center">{item.ranking}º</span>
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs">{item.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className={`text-sm font-medium ${item.employee_id === employeeId ? 'text-blue-700' : 'text-gray-900'}`}>
                                            {item.name} {item.employee_id === employeeId && '(Você)'}
                                        </p>
                                    </div>
                                    <span className="font-bold text-gray-900">{item.total_score} pts</span>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {ranking.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            Ranking ainda não disponível.
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
