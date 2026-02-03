import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, Trophy, Calendar, CheckCircle, XCircle, Medal } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Occurrence {
    id: string;
    type: string;
    points: number;
    description: string;
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

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            // 1. Get Employee ID
            const { data: employee } = await supabase
                .from("employees")
                .select("id")
                .eq("user_id", user?.id)
                .single();

            if (!employee) return;
            setEmployeeId(employee.id);

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
                                <Card key={occ.id} className="overflow-hidden">
                                    <div className={`h-1 w-full ${occ.points >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <CardContent className="p-4 flex items-start justify-between">
                                        <div className="flex gap-3">
                                            <div className="mt-1">
                                                {getIcon(occ.type)}
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900 capitalize">{getTypeLabel(occ.type)}</h4>
                                                <p className="text-sm text-gray-500 mt-1">{occ.description}</p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    {format(new Date(occ.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                                </p>
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
