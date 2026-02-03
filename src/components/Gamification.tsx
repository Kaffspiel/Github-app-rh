import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Trophy, TrendingUp, TrendingDown, Award, Target, CheckCircle2, Clock, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EmployeeScore {
  id: string;
  name: string;
  totalScore: number;
  ranking: number;
  assiduity: { score: number };
  punctuality: { score: number };
  productivity: { score: number };
  trend: "stable"; // Simplificado por enquanto
}

export function Gamification() {
  const [employees, setEmployees] = useState<EmployeeScore[]>([]);
  const [loading, setLoading] = useState(true);

  const weights = {
    assiduity: 30,
    punctuality: 30,
    productivity: 40,
  };

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const { data, error } = await supabase.rpc('get_company_ranking' as any);

      if (error) throw error;

      if (data) {
        // Mapeando dados do RPC para o formato esperado pelo componente
        // Nota: Assiduidade/Pontualidade/Produtividade ainda não são calculados individualmente no backend
        // Então usaremos placeholders baseados no score total ou valores padrão por enquanto
        const mappedEmployees: EmployeeScore[] = (data as any[]).map((emp) => ({
          id: emp.employee_id,
          name: emp.name,
          totalScore: emp.total_score,
          ranking: emp.ranking,
          trend: "stable",
          // Simulando distribuição baseada no total score para preencher a UI
          assiduity: { score: Math.min(100, Math.round(emp.total_score * 1.1)) },
          punctuality: { score: Math.min(100, Math.round(emp.total_score * 1.0)) },
          productivity: { score: Math.min(100, Math.round(emp.total_score * 0.9)) },
        }));
        setEmployees(mappedEmployees);
      }
    } catch (error) {
      console.error("Error fetching ranking:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: EmployeeScore["trend"]) => {
    return <div className="w-4 h-4 border-t-2 border-gray-400" />;
  };

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge className="bg-yellow-500 text-white">🥇 1º Lugar</Badge>;
      case 2:
        return <Badge className="bg-gray-400 text-white">🥈 2º Lugar</Badge>;
      case 3:
        return <Badge className="bg-orange-700 text-white">🥉 3º Lugar</Badge>;
      default:
        return <Badge variant="outline">{position}º Lugar</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Identificar Top 3
  const top1 = employees.find(e => e.ranking === 1);
  const top2 = employees.find(e => e.ranking === 2);
  const top3 = employees.find(e => e.ranking === 3);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gamificação</h1>
          <p className="text-gray-500 mt-1">Ranking e performance da equipe (Baseado em Ocorrências)</p>
        </div>
        <Button variant="outline" disabled>
          <Award className="w-4 h-4 mr-2" />
          Pesos Fixos (30/30/40)
        </Button>
      </div>

      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span>Ranking & Pódio</span>
          </TabsTrigger>
          <TabsTrigger value="reconhecimento" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span>Metricas Detalhadas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-6">
          {/* Top 3 Podium */}
          {employees.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-8">
              {/* 2nd Place */}
              {top2 && (
                <Card className="border-2 border-gray-300 order-2 md:order-1">
                  <CardHeader className="text-center pb-3">
                    <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center text-3xl shadow-inner">
                      🥈
                    </div>
                    <CardTitle className="text-lg">{top2.name}</CardTitle>
                    <Badge className="bg-gray-400 text-white mt-2 mx-auto w-fit">2º Lugar</Badge>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-4xl font-bold text-gray-600">{top2.totalScore}</div>
                    <p className="text-sm text-gray-500 mt-1">pontos</p>
                  </CardContent>
                </Card>
              )}

              {/* 1st Place */}
              {top1 && (
                <Card className="border-4 border-yellow-400 transform scale-105 shadow-xl order-1 md:order-2 z-10">
                  <CardHeader className="text-center pb-3">
                    <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full mx-auto mb-2 flex items-center justify-center text-4xl shadow-lg text-white">
                      🥇
                    </div>
                    <CardTitle className="text-xl">{top1.name}</CardTitle>
                    <Badge className="bg-yellow-500 text-white mt-2 mx-auto w-fit">1º Lugar</Badge>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-5xl font-bold text-yellow-600">{top1.totalScore}</div>
                    <p className="text-sm text-gray-500 mt-1">pontos</p>
                  </CardContent>
                </Card>
              )}

              {/* 3rd Place */}
              {top3 && (
                <Card className="border-2 border-orange-300 order-3">
                  <CardHeader className="text-center pb-3">
                    <div className="w-20 h-20 bg-orange-200 rounded-full mx-auto mb-2 flex items-center justify-center text-3xl shadow-inner">
                      🥉
                    </div>
                    <CardTitle className="text-lg">{top3.name}</CardTitle>
                    <Badge className="bg-orange-700 text-white mt-2 mx-auto w-fit">3º Lugar</Badge>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-4xl font-bold text-orange-700">{top3.totalScore}</div>
                    <p className="text-sm text-gray-500 mt-1">pontos</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ranking Geral da Equipe</CardTitle>
              <Badge variant="outline">Total: {employees.length} Colaboradores</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employees.sort((a, b) => a.ranking - b.ranking).map((employee) => (
                  <div
                    key={employee.id}
                    className={`p-4 rounded-lg border-2 transition-all hover:scale-[1.01] ${employee.ranking <= 3
                      ? "bg-gradient-to-r from-yellow-50/50 to-orange-50/50 border-yellow-200 shadow-sm"
                      : "bg-white border-gray-100"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 flex justify-center">
                            {getPositionBadge(employee.ranking)}
                          </div>
                        </div>

                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{employee.name}</h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-gray-500">
                            {/* Metrics placeholders */}
                            <div>
                              <span>Score Geral:</span>{" "}
                              <span className={`font-semibold ${getScoreColor(employee.totalScore)}`}>{employee.totalScore}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-2xl font-black ${getScoreColor(employee.totalScore)}`}>{employee.totalScore}</div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Pontos</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Progress value={employee.totalScore} className="h-2 rounded-full" />
                    </div>
                  </div>
                ))}

                {employees.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    Nenhum colaborador com pontuação registrada ainda.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconhecimento" className="space-y-6">
          {/* Legacy/Detailed View with Placeholders */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas Detalhadas (Estimadas)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Reuse logic but mapped to new structure */}
              <div className="text-sm text-muted-foreground italic">
                As métricas detalhadas (Assiduidade, Pontualidade) serão calculadas automaticamente com base no histórico de ocorrências em futuras atualizações.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employees.map((employee) => (
                  <Card key={employee.id} className="border border-gray-200">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <span className="font-bold">{employee.name}</span>
                        <span className="font-bold text-lg">{employee.totalScore} pts</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center">
                          <span>Assiduidade</span>
                          <Progress value={employee.assiduity.score} className="w-20 h-2" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Pontualidade</span>
                          <Progress value={employee.punctuality.score} className="w-20 h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
