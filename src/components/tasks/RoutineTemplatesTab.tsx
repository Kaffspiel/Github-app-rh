import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Users, Clock, Copy, Play, Loader2, X, GripVertical } from "lucide-react";
import { useRoutineTemplates, ChecklistItemTemplate } from "@/hooks/useRoutineTemplates";
import { useEmployeesList } from "@/hooks/useEmployeesList";
import { useAuth } from "@/context/AuthContext";

export function RoutineTemplatesTab() {
  const {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    assignTemplate,
    unassignTemplate,
    createTaskFromTemplate,
  } = useRoutineTemplates();
  const { employees } = useEmployeesList();
  const { user } = useAuth();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  // New template form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newChecklistItems, setNewChecklistItems] = useState<ChecklistItemTemplate[]>([]);
  const [newAutoAssign, setNewAutoAssign] = useState(false);
  const [newAutoAssignTime, setNewAutoAssignTime] = useState("00:00");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setNewChecklistItems([
      ...newChecklistItems,
      { text: newChecklistText.trim(), sort_order: newChecklistItems.length }
    ]);
    setNewChecklistText("");
  };

  const handleRemoveChecklistItem = (index: number) => {
    setNewChecklistItems(newChecklistItems.filter((_, i) => i !== index));
  };

  const handleCreateTemplate = async () => {
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      await createTemplate({
        name: newName,
        description: newDescription,
        checklist_items: newChecklistItems,
        auto_assign: newAutoAssign,
        auto_assign_time: newAutoAssign ? newAutoAssignTime : undefined,
      });

      setIsCreateDialogOpen(false);
      resetForm();
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setNewName("");
    setNewDescription("");
    setNewChecklistItems([]);
    setNewAutoAssign(false);
    setNewAutoAssignTime("00:00");
    setNewChecklistText("");
  };

  const handleAssign = async () => {
    if (!selectedTemplateId || !selectedEmployeeId) return;
    await assignTemplate(selectedTemplateId, selectedEmployeeId);
    setIsAssignDialogOpen(false);
    setSelectedEmployeeId("");
    setSelectedTemplateId(null);
  };

  const handleCreateTask = async (templateId: string, employeeId: string) => {
    await createTaskFromTemplate(templateId, employeeId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Templates de Rotinas Diárias</h2>
          <p className="text-sm text-muted-foreground">
            Crie modelos reutilizáveis e atribua a funcionários
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Template de Rotina</DialogTitle>
              <DialogDescription>
                Defina uma rotina que poderá ser atribuída automaticamente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nome do Template *</Label>
                <Input
                  id="template-name"
                  placeholder="Ex: Abertura de Caixa"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Descrição</Label>
                <Textarea
                  id="template-description"
                  placeholder="Descreva o objetivo desta rotina..."
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Itens do Checklist</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar item..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                  />
                  <Button type="button" size="icon" onClick={handleAddChecklistItem}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {newChecklistItems.length > 0 && (
                  <div className="space-y-2 mt-2 p-3 bg-muted rounded-lg">
                    {newChecklistItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1">{item.text}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveChecklistItem(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-assign">Atribuição Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Criar tarefas automaticamente todo dia
                  </p>
                </div>
                <Switch
                  id="auto-assign"
                  checked={newAutoAssign}
                  onCheckedChange={setNewAutoAssign}
                />
              </div>

              {newAutoAssign && (
                <div className="space-y-2">
                  <Label htmlFor="auto-time">Horário de Criação</Label>
                  <Input
                    id="auto-time"
                    type="time"
                    value={newAutoAssignTime}
                    onChange={(e) => setNewAutoAssignTime(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTemplate} disabled={!newName.trim() || isCreating}>
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Copy className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhum template criado</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Crie templates de rotinas diárias para padronizar as tarefas da sua equipe
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-4">
          {templates.map((template) => (
            <AccordionItem key={template.id} value={template.id} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 text-left">
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.checklist_items.length} itens • {template.assignments?.length || 0} atribuições
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {template.auto_assign && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {template.auto_assign_time}
                      </Badge>
                    )}
                    {!template.is_active && (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}

                  {template.checklist_items.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Checklist</Label>
                      <div className="grid gap-1">
                        {template.checklist_items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                            <span className="w-5 h-5 flex items-center justify-center bg-background rounded text-xs">
                              {idx + 1}
                            </span>
                            {item.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase text-muted-foreground">Colaboradores Atribuídos</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplateId(template.id);
                          setIsAssignDialogOpen(true);
                        }}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Atribuir
                      </Button>
                    </div>

                    {template.assignments && template.assignments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {template.assignments.map((assignment) => (
                          <Badge
                            key={assignment.id}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {assignment.employee_name}
                            <button
                              onClick={() => unassignTemplate(assignment.id)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleCreateTask(template.id, assignment.employee_id)}
                              className="ml-1 hover:text-primary"
                              title="Criar tarefa agora"
                            >
                              <Play className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum colaborador atribuído</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTemplate(template.id, { is_active: !template.is_active })}
                    >
                      {template.is_active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Template</DialogTitle>
            <DialogDescription>
              Selecione o colaborador que receberá esta rotina diária
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="flex items-end gap-2">
              <div className="grid gap-1.5 flex-1">
                <Label htmlFor="assign-employee">Colaborador</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger id="assign-employee">
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} {emp.id === employees.find(e => e.email === user?.email)?.id ? '(Eu)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  const myId = employees.find(e => e.email === user?.email)?.id;
                  if (myId) setSelectedEmployeeId(myId);
                }}
                disabled={!employees.find(e => e.email === user?.email)}
              >
                Atribuir a mim
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={!selectedEmployeeId}>
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
