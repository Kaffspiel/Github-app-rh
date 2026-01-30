import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/context/CompanyContext";
import { 
  Users, Plus, Search, Phone, Mail, Building2, Shield, 
  MessageSquare, Bell, Clock, CheckCircle2, XCircle,
  Pencil, Trash2, MoreVertical, Send
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tables } from "@/integrations/supabase/types";

type Employee = Tables<"employees">;

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const { toast } = useToast();
  const { companyId, company } = useCompany();
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "Geral",
    role: "colaborador" as "colaborador" | "gestor" | "admin",
    whatsapp_number: "",
    whatsapp_verified: false,
    notify_whatsapp: true,
    notify_in_app: true,
    notify_tasks: true,
    notify_time_tracking: true,
    notify_reminders: true,
    notify_announcements: true,
    quiet_hours_start: "",
    quiet_hours_end: "",
    is_active: true,
  });

  useEffect(() => {
    if (companyId) {
      fetchEmployees();
    }
  }, [companyId]);

  const fetchEmployees = async () => {
    if (!companyId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("company_id", companyId)
      .order("name");

    if (error) {
      toast({
        title: "Erro ao carregar colaboradores",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e e-mail são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: formData.name,
      email: formData.email,
      department: formData.department,
      role: formData.role,
      company_id: companyId,
      whatsapp_number: formData.whatsapp_number || null,
      whatsapp_verified: formData.whatsapp_verified,
      notify_whatsapp: formData.notify_whatsapp,
      notify_in_app: formData.notify_in_app,
      notify_tasks: formData.notify_tasks,
      notify_time_tracking: formData.notify_time_tracking,
      notify_reminders: formData.notify_reminders,
      notify_announcements: formData.notify_announcements,
      quiet_hours_start: formData.quiet_hours_start || null,
      quiet_hours_end: formData.quiet_hours_end || null,
      is_active: formData.is_active,
    };

    if (editingEmployee) {
      const { error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", editingEmployee.id);

      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Colaborador atualizado!" });
    } else {
      const { error } = await supabase.from("employees").insert(payload);

      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Colaborador criado!" });
    }

    setIsDialogOpen(false);
    resetForm();
    fetchEmployees();
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      whatsapp_number: employee.whatsapp_number || "",
      whatsapp_verified: employee.whatsapp_verified || false,
      notify_whatsapp: employee.notify_whatsapp ?? true,
      notify_in_app: employee.notify_in_app ?? true,
      notify_tasks: employee.notify_tasks ?? true,
      notify_time_tracking: employee.notify_time_tracking ?? true,
      notify_reminders: employee.notify_reminders ?? true,
      notify_announcements: employee.notify_announcements ?? true,
      quiet_hours_start: employee.quiet_hours_start || "",
      quiet_hours_end: employee.quiet_hours_end || "",
      is_active: employee.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este colaborador?")) return;

    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Colaborador excluído!" });
    fetchEmployees();
  };

  const handleSendTestMessage = async (employee: Employee) => {
    if (!employee.whatsapp_number) {
      toast({ title: "WhatsApp não configurado", variant: "destructive" });
      return;
    }

    setSendingTest(employee.id);

    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          recipientId: employee.id,
          type: "announcement",
          title: "Teste de Conexão",
          message: `Olá ${employee.name}! Esta é uma mensagem de teste do OpsControl.`,
          priority: "normal",
          n8nWebhookUrl: "https://n8n.kaffspiel.cloud/webhook/opscontrol-send",
          evolutionInstance: "teste",
        },
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: `WhatsApp enviado para ${employee.name}`,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao enviar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSendingTest(null);
    }
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      name: "",
      email: "",
      department: "Geral",
      role: "colaborador",
      whatsapp_number: "",
      whatsapp_verified: false,
      notify_whatsapp: true,
      notify_in_app: true,
      notify_tasks: true,
      notify_time_tracking: true,
      notify_reminders: true,
      notify_announcements: true,
      quiet_hours_start: "",
      quiet_hours_end: "",
      is_active: true,
    });
  };

  const departments = [...new Set(employees.map((e) => e.department))];

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.whatsapp_number?.includes(searchTerm);
    const matchesDepartment = filterDepartment === "all" || emp.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500 hover:bg-purple-600">Admin</Badge>;
      case "gestor":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Gestor</Badge>;
      default:
        return <Badge variant="secondary">Colaborador</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Gestão de Colaboradores
          </h1>
          <p className="text-gray-500 mt-1">
            {employees.length} colaboradores cadastrados
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Editar Colaborador" : "Novo Colaborador"}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="preferences">Preferências</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@empresa.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Input
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Ex: Vendas, TI, RH"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Função</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "colaborador" | "gestor" | "admin") =>
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="colaborador">Colaborador</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Colaborador ativo</Label>
                </div>
              </TabsContent>

              <TabsContent value="whatsapp" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Número WhatsApp</Label>
                  <Input
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    placeholder="5511999999999 (apenas números)"
                  />
                  <p className="text-xs text-gray-500">
                    Formato: código do país + DDD + número, sem espaços ou símbolos
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={formData.whatsapp_verified}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, whatsapp_verified: checked })
                    }
                  />
                  <Label>Número verificado</Label>
                </div>

                <Card className="bg-blue-50 border-blue-100">
                  <CardContent className="p-4 text-sm text-blue-800">
                    <p className="font-medium mb-1">💡 Dica</p>
                    <p>
                      Após cadastrar, envie uma mensagem de teste para verificar se o número
                      está correto e o colaborador recebeu.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Canais de Notificação</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                        <span>WhatsApp</span>
                      </div>
                      <Switch
                        checked={formData.notify_whatsapp}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, notify_whatsapp: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-600" />
                        <span>Notificações In-App</span>
                      </div>
                      <Switch
                        checked={formData.notify_in_app}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, notify_in_app: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Tipos de Notificação</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "notify_tasks", label: "Tarefas" },
                      { key: "notify_time_tracking", label: "Controle de Ponto" },
                      { key: "notify_reminders", label: "Lembretes" },
                      { key: "notify_announcements", label: "Comunicados" },
                    ].map(({ key, label }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 bg-white rounded border"
                      >
                        <span className="text-sm">{label}</span>
                        <Switch
                          checked={formData[key as keyof typeof formData] as boolean}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, [key]: checked })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Horário Silencioso
                  </Label>
                  <p className="text-xs text-gray-500">
                    Durante este período, notificações WhatsApp não serão enviadas
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Início</Label>
                      <Input
                        type="time"
                        value={formData.quiet_hours_start}
                        onChange={(e) =>
                          setFormData({ ...formData, quiet_hours_start: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Fim</Label>
                      <Input
                        type="time"
                        value={formData.quiet_hours_end}
                        onChange={(e) =>
                          setFormData({ ...formData, quiet_hours_end: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingEmployee ? "Salvar Alterações" : "Criar Colaborador"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, e-mail ou WhatsApp..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : filteredEmployees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum colaborador encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => (
            <Card
              key={employee.id}
              className={`border transition-all hover:shadow-md ${
                !employee.is_active ? "opacity-60 bg-gray-50" : "bg-white"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {employee.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {employee.department}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(employee)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSendTestMessage(employee)}
                        disabled={!employee.whatsapp_number || sendingTest === employee.id}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sendingTest === employee.id ? "Enviando..." : "Enviar Teste"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    {employee.whatsapp_number ? (
                      <span className="flex items-center gap-1">
                        {employee.whatsapp_number}
                        {employee.whatsapp_verified ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-yellow-500" />
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Não configurado</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  {getRoleBadge(employee.role)}
                  <div className="flex items-center gap-1">
                    {employee.notify_whatsapp && (
                      <MessageSquare className="w-4 h-4 text-green-500" />
                    )}
                    {employee.notify_in_app && <Bell className="w-4 h-4 text-blue-500" />}
                    {!employee.is_active && (
                      <Badge variant="outline" className="text-gray-500 ml-2">
                        Inativo
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
