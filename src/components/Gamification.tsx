import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Trophy, TrendingUp, TrendingDown, Award, Target, CheckCircle2, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface EmployeeScore {
  id: string;
  name: string;
  avatar?: string;
  totalScore: number;
  assiduity: {
    score: number;
    absences: number;
    medicalCertificates: number;
  };
  punctuality: {
    score: number;
    clockDelays: number;
    taskDelays: number;
  };
  productivity: {
    score: number;
    completedTasks: number;
    weightedScore: number;
  };
  trend: "up" | "down" | "stable";
  position: number;
  previousPosition?: number;
}

export function Gamification() {
  const weights = {
    assiduity: 30,
    punctuality: 30,
    productivity: 40,
  };

  const employees: EmployeeScore[] = [
    {
      id: "1",
      name: "Ana Lima",
      totalScore: 95,
      assiduity: { score: 100, absences: 0, medicalCertificates: 0 },
      punctuality: { score: 95, clockDelays: 1, taskDelays: 0 },
      productivity: { score: 92, completedTasks: 18, weightedScore: 425 },
      trend: "up",
      position: 1,
      previousPosition: 2,
    },
    {
      id: "2",
      name: "Pedro Costa",
      totalScore: 92,
      assiduity: { score: 95, absences: 0, medicalCertificates: 1 },
      punctuality: { score: 100, clockDelays: 0, taskDelays: 0 },
      productivity: { score: 85, completedTasks: 15, weightedScore: 380 },
      trend: "stable",
      position: 2,
      previousPosition: 2,
    },
    {
      id: "3",
      name: "Maria Santos",
      totalScore: 88,
      assiduity: { score: 100, absences: 0, medicalCertificates: 0 },
      punctuality: { score: 90, clockDelays: 2, taskDelays: 0 },
      productivity: { score: 82, completedTasks: 14, weightedScore: 350 },
      trend: "up",
      position: 3,
      previousPosition: 4,
    },
    {
      id: "4",
      name: "Carlos Rocha",
      totalScore: 85,
      assiduity: { score: 90, absences: 1, medicalCertificates: 0 },
      punctuality: { score: 85, clockDelays: 3, taskDelays: 1 },
      productivity: { score: 83, completedTasks: 13, weightedScore: 340 },
      trend: "down",
      position: 4,
      previousPosition: 3,
    },
    {
      id: "5",
      name: "Julia Mendes",
      totalScore: 82,
      assiduity: { score: 85, absences: 1, medicalCertificates: 1 },
      punctuality: { score: 75, clockDelays: 5, taskDelays: 2 },
      productivity: { score: 85, completedTasks: 16, weightedScore: 390 },
      trend: "stable",
      position: 5,
      previousPosition: 5,
    },
    {
      id: "6",
      name: "Roberto Alves",
      totalScore: 78,
      assiduity: { score: 80, absences: 2, medicalCertificates: 0 },
      punctuality: { score: 70, clockDelays: 6, taskDelays: 3 },
      productivity: { score: 82, completedTasks: 12, weightedScore: 310 },
      trend: "down",
      position: 6,
      previousPosition: 5,
    },
    {
      id: "7",
      name: "Fernanda Cruz",
      totalScore: 75,
      assiduity: { score: 75, absences: 2, medicalCertificates: 1 },
      punctuality: { score: 80, clockDelays: 4, taskDelays: 1 },
      productivity: { score: 70, completedTasks: 10, weightedScore: 280 },
      trend: "stable",
      position: 7,
      previousPosition: 7,
    },
  ];

  const getTrendIcon = (trend: EmployeeScore["trend"]) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case "stable":
        return <div className="w-4 h-4 border-t-2 border-gray-400" />;
    }
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gamificação</h1>
          <p className="text-gray-500 mt-1">Ranking e performance da equipe</p>
        </div>
        <Button>
          <Award className="w-4 h-4 mr-2" />
          Configurar Pesos
        </Button>
      </div>

      <Tabs defaultValue="reconhecimento" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reconhecimento" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden md:inline">Premiar e Reconhecer</span>
            <span className="md:hidden">Premiar</span>
          </TabsTrigger>
          <TabsTrigger value="atencao" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden md:inline">Atenção Necessária</span>
            <span className="md:hidden">Atenção</span>
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden md:inline">Ranking Geral</span>
            <span className="md:hidden">Ranking</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reconhecimento" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Pesos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Assiduidade
                    </Label>
                    <span className="text-sm font-medium">{weights.assiduity}%</span>
                  </div>
                  <Slider defaultValue={[weights.assiduity]} max={100} step={5} />
                  <p className="text-xs text-gray-500">Faltas e atestados</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Pontualidade
                    </Label>
                    <span className="text-sm font-medium">{weights.punctuality}%</span>
                  </div>
                  <Slider defaultValue={[weights.punctuality]} max={100} step={5} />
                  <p className="text-xs text-gray-500">Atrasos de ponto e tarefas</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-600" />
                      Produtividade
                    </Label>
                    <span className="text-sm font-medium">{weights.productivity}%</span>
                  </div>
                  <Slider defaultValue={[weights.productivity]} max={100} step={5} />
                  <p className="text-xs text-gray-500">Tarefas concluídas (por peso)</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <Trophy className="w-5 h-5" />
                  <span className="font-medium">Total:</span>
                </div>
                <span className="text-lg font-bold text-blue-700">{weights.assiduity + weights.punctuality + weights.productivity}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4 items-end">
            {/* 2nd Place */}
            <Card className="border-2 border-gray-300">
              <CardHeader className="text-center pb-3">
                <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center text-3xl">
                  🥈
                </div>
                <CardTitle className="text-lg">{employees[1].name}</CardTitle>
                <Badge className="bg-gray-400 text-white mt-2">2º Lugar</Badge>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-gray-600">{employees[1].totalScore}</div>
                <p className="text-sm text-gray-500 mt-1">pontos</p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Assiduidade:</span>
                    <span className="font-medium">{employees[1].assiduity.score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pontualidade:</span>
                    <span className="font-medium">{employees[1].punctuality.score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Produtividade:</span>
                    <span className="font-medium">{employees[1].productivity.score}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 1st Place */}
            <Card className="border-4 border-yellow-400 transform scale-105">
              <CardHeader className="text-center pb-3">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full mx-auto mb-2 flex items-center justify-center text-4xl">
                  🥇
                </div>
                <CardTitle className="text-xl">{employees[0].name}</CardTitle>
                <Badge className="bg-yellow-500 text-white mt-2">1º Lugar</Badge>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-5xl font-bold text-yellow-600">{employees[0].totalScore}</div>
                <p className="text-sm text-gray-500 mt-1">pontos</p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Assiduidade:</span>
                    <span className="font-medium text-green-600">{employees[0].assiduity.score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pontualidade:</span>
                    <span className="font-medium text-green-600">{employees[0].punctuality.score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Produtividade:</span>
                    <span className="font-medium text-green-600">{employees[0].productivity.score}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3rd Place */}
            <Card className="border-2 border-orange-300">
              <CardHeader className="text-center pb-3">
                <div className="w-20 h-20 bg-orange-200 rounded-full mx-auto mb-2 flex items-center justify-center text-3xl">
                  🥉
                </div>
                <CardTitle className="text-lg">{employees[2].name}</CardTitle>
                <Badge className="bg-orange-700 text-white mt-2">3º Lugar</Badge>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-orange-700">{employees[2].totalScore}</div>
                <p className="text-sm text-gray-500 mt-1">pontos</p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Assiduidade:</span>
                    <span className="font-medium">{employees[2].assiduity.score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pontualidade:</span>
                    <span className="font-medium">{employees[2].punctuality.score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Produtividade:</span>
                    <span className="font-medium">{employees[2].productivity.score}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="atencao" className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900">Atenção Necessária</h3>
                <p className="text-sm text-red-700">Colaboradores com performance abaixo da meta ou em queda.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...employees].sort((a, b) => a.totalScore - b.totalScore).slice(0, 3).map((employee) => (
                <Card key={employee.id} className="border-l-4 border-l-red-500 shadow-md bg-white hover:shadow-lg transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{employee.name}</h4>
                        <Badge variant="secondary" className="mt-1">{employee.position}º Lugar no Ranking</Badge>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-red-600">{employee.totalScore}</span>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Pontos</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-500">Pontualidade</span>
                          <span className="text-red-600">{employee.punctuality.score}%</span>
                        </div>
                        <Progress value={employee.punctuality.score} className="h-2 bg-red-100 [&>div]:bg-red-500" />
                        <p className="text-[10px] text-gray-400">Atrasos (Ponto/Tarefa): {employee.punctuality.clockDelays}/{employee.punctuality.taskDelays}</p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-500">Produtividade</span>
                          <span className="text-orange-600">{employee.productivity.score}%</span>
                        </div>
                        <Progress value={employee.productivity.score} className="h-2 bg-orange-100 [&>div]:bg-orange-500" />
                        <p className="text-[10px] text-gray-400">Tarefas Concluídas: {employee.productivity.completedTasks}</p>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full mt-6 border-red-200 text-red-600 hover:bg-red-50 font-bold">
                      Chamar para Conversa
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 p-4 bg-white/60 rounded-lg border border-dashed border-red-200 text-sm italic text-red-800">
              💡 Dica do Gestor: Estes colaboradores apresentam os menores índices de performance. Recomenda-se uma reunião individual para entender os motivos e definir um plano de melhoria.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ranking Geral da Equipe</CardTitle>
              <Badge variant="outline">Total: {employees.length} Colaboradores</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...employees].sort((a, b) => b.totalScore - a.totalScore).map((employee) => (
                  <div
                    key={employee.id}
                    className={`p-4 rounded-lg border-2 transition-all hover:scale-[1.01] ${employee.position <= 3
                      ? "bg-gradient-to-r from-yellow-50/50 to-orange-50/50 border-yellow-200 shadow-sm"
                      : employee.position >= employees.length - 2
                        ? "bg-red-50/30 border-red-100"
                        : "bg-white border-gray-100"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 flex justify-center">
                            {getPositionBadge(employee.position)}
                          </div>
                          {getTrendIcon(employee.trend)}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{employee.name}</h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-gray-500">
                            <div>
                              <span>Assiduidade:</span>{" "}
                              <span className={`font-semibold ${getScoreColor(employee.assiduity.score)}`}>{employee.assiduity.score}%</span>
                            </div>
                            <div>
                              <span>Pontualidade:</span>{" "}
                              <span className={`font-semibold ${getScoreColor(employee.punctuality.score)}`}>{employee.punctuality.score}%</span>
                            </div>
                            <div>
                              <span>Produtividade:</span>{" "}
                              <span className={`font-semibold ${getScoreColor(employee.productivity.score)}`}>{employee.productivity.score}%</span>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
