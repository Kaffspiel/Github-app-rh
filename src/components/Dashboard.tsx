import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, CheckCircle2, Users, CalendarClock, User, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useApp } from "@/context/AppContext";

export function Dashboard() {
  const { tasks, timeRecords, currentUser, setCurrentView, setTaskFilter } = useApp();
  const [period, setPeriod] = useState("hoje");

  const handleShortcut = (filter: string) => {
    setTaskFilter(filter);
    setCurrentView("tasks");
  };

  const allUrgentTasks = tasks.filter(t => (t.priority === 'alta' && t.status !== 'concluido') || t.status === 'atrasada');
  const myUrgentTasks = allUrgentTasks.filter(t => t.assignee === currentUser);
  const teamUrgentTasks = allUrgentTasks.filter(t => t.assignee !== currentUser);

  const occurrences = timeRecords.filter(r => r.status !== 'normal');

  const stats = {
    tasks: {
      pendentes: tasks.filter(t => t.status === 'pendente').length,
      emAndamento: tasks.filter(t => t.status === 'andamento').length,
      prorrogadas: 0,
      atrasadas: tasks.filter(t => t.status === 'atrasada').length,
      concluidas: tasks.filter(t => t.status === 'concluido').length,
    },
    performance: 87,
  };

  const getOccurrenceColor = (type: string) => {
    switch (type) {
      case "delay": return "bg-orange-500/10 text-orange-600 border-orange-200";
      case "absence": return "bg-red-500/10 text-red-600 border-red-200";
      case "error": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const TaskItem = ({ task, isMine }: { task: any, isMine: boolean }) => (
    <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${isMine ? 'bg-white border-red-100' : 'bg-white/80 border-gray-100 hover:border-orange-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <Badge
          variant={task.status === "atrasada" ? "destructive" : "secondary"}
          className={`text-[10px] px-2 py-0.5 h-5 ${task.status === 'atrasada' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
        >
          {task.status === 'atrasada' ? 'ATRASADO' : 'ALTA PRIORIDADE'}
        </Badge>
        {!isMine && (
          <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full border">
            <User className="w-3 h-3" />
            {task.assignee.split(' ')[0]}
          </div>
        )}
      </div>

      <h4 className="font-semibold text-gray-800 leading-tight mb-1 line-clamp-2">{task.title}</h4>
      <p className="text-xs text-gray-500 line-clamp-1 mb-3">{task.description}</p>

      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <CalendarClock className="w-3.5 h-3.5" />
          <span className={task.status === 'atrasada' ? "text-red-500" : ""}>{task.dueDate}</span>
        </div>

        {isMine ? (
          <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white w-24 rounded-full shadow-sm shadow-red-100">
            Resolver
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400 hover:text-blue-600 w-auto px-2">
            Ver detalhes <Users className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard do Gestor</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2 text-sm">
            <CalendarClock className="w-4 h-4" />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="h-9 px-4 bg-white border-dashed text-gray-500 font-normal">
            Última atualização: Agora
          </Badge>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px] bg-white shadow-sm border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card
          className="shadow-sm border-gray-200 hover:border-gray-400 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => handleShortcut("pendente")}
        >
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 group-hover:text-gray-600 transition-colors">Pendentes</span>
            <div className="text-3xl font-bold text-gray-700">{stats.tasks.pendentes}</div>
          </CardContent>
        </Card>
        <Card
          className="shadow-sm border-blue-100 bg-blue-50/30 hover:bg-blue-100 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => handleShortcut("andamento")}
        >
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 group-hover:text-blue-600 transition-colors">Em Andamento</span>
            <div className="text-3xl font-bold text-blue-600">{stats.tasks.emAndamento}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-orange-100 bg-orange-50/30">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Prorrogadas</span>
            <div className="text-3xl font-bold text-orange-600">{stats.tasks.prorrogadas}</div>
          </CardContent>
        </Card>
        <Card
          className="shadow-sm border-red-100 bg-red-50/30 hover:bg-red-100 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => handleShortcut("atrasada")}
        >
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1 group-hover:text-red-600 transition-colors">Atrasadas</span>
            <div className="text-3xl font-bold text-red-600">{stats.tasks.atrasadas}</div>
          </CardContent>
        </Card>
        <Card
          className="shadow-sm border-green-100 bg-green-50/30 hover:bg-green-100 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => handleShortcut("concluido")}
        >
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-green-400 uppercase tracking-wider mb-1 group-hover:text-green-600 transition-colors">Concluídas</span>
            <div className="text-3xl font-bold text-green-600">{stats.tasks.concluidas}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Equipe</span>
            <div className="text-3xl font-bold text-gray-700">{stats.performance}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Focus Column (Urgency) - Span 4 */}
        <div className="lg:col-span-4 space-y-6">
          {/* MY Urgent Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Minhas Urgências
              </h3>
              <Badge variant="destructive" className="rounded-full px-2">{myUrgentTasks.length}</Badge>
            </div>

            <div className="space-y-3">
              {myUrgentTasks.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500">Você está em dia! Nada urgente.</p>
                </div>
              ) : (
                myUrgentTasks.map((task) => <TaskItem key={task.id} task={task} isMine={true} />)
              )}
            </div>
          </div>

          {/* TEAM Urgent Tasks */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Urgências da Equipe
              </h3>
              {teamUrgentTasks.length > 0 && <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">{teamUrgentTasks.length} tarefas</span>}
            </div>

            <div className="space-y-3">
              {teamUrgentTasks.length === 0 ? <p className="text-sm text-gray-500 italic px-4">Nenhuma pendência crítica na equipe. Ótimo trabalho!</p> :
                teamUrgentTasks.slice(0, 4).map((task) => <TaskItem key={task.id} task={task} isMine={false} />)
              }
            </div>
          </div>
        </div>

        {/* Right Column - Overview & Analytics - Span 8 */}
        <div className="lg:col-span-8 space-y-6">
          {/* Occurrences (From Time Records) */}
          <Card className="border-none shadow-md bg-white overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-500" />
                  Ocorrências de Ponto Recentes
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs">Ver todas</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {occurrences.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Nenhuma ocorrência registrada hoje.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {occurrences.slice(0, 5).map((occurrence) => (
                    <div key={occurrence.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-10 rounded-full ${getOccurrenceColor(occurrence.status).split(' ')[0]}`} />
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{occurrence.employee}</p>
                          <p className="text-xs text-gray-500">{occurrence.date} • {occurrence.entry1}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <Badge variant="outline" className={`${getOccurrenceColor(occurrence.status)} border-0 font-medium`}>
                            {occurrence.status === 'missing-punch' ? 'Ponto Ausente' : occurrence.status === 'delay' ? 'Atraso' : occurrence.status}
                          </Badge>
                          <p className="text-[10px] text-gray-400 mt-1 max-w-[150px] truncate">{occurrence.issue}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-gray-600"><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Center/Right - General Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <Users className="w-5 h-5" />
                      <span className="font-medium">Equipe Ativa</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">24/28</p>
                    <p className="text-sm text-blue-600 mt-1">86% de presença</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Taxa de Conclusão</span>
                    </div>
                    <p className="text-3xl font-bold text-green-900">92%</p>
                    <p className="text-sm text-green-600 mt-1">+5% vs. ontem</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
