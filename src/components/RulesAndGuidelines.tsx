import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { useAuth } from "@/context/AuthContext";
import { Plus, Search, BookOpen, FileText, Download, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function RulesAndGuidelines() {
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();
    const { companyId } = useCompany();
    const { isAdmin, isGestor } = useAuth();
    const canManage = isAdmin() || isGestor();

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        file: null as File | null
    });

    useEffect(() => {
        if (companyId) {
            fetchRules();
        }
    }, [companyId]);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("company_rules")
                .select("*")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setRules(data || []);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar regras",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, file: e.target.files[0] });
        }
    };

    const handleUpload = async () => {
        if (!formData.title || !formData.file) {
            toast({
                title: "Campos obrigatórios",
                description: "Título e arquivo são obrigatórios.",
                variant: "destructive"
            });
            return;
        }

        setSubmitting(true);
        setUploading(true);

        try {
            const fileExt = formData.file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${companyId}/${fileName}`;

            // Upload file to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('documents') // Assuming 'documents' bucket exists
                .upload(filePath, formData.file);

            if (uploadError) {
                throw new Error(`Erro no upload: ${uploadError.message}`);
            }

            // Get public URL (or use signed URL if private)
            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            // Save metadata to database
            const { error: dbError } = await supabase
                .from("company_rules")
                .insert({
                    company_id: companyId,
                    title: formData.title,
                    description: formData.description,
                    file_url: publicUrl // Store the URL
                });

            if (dbError) throw dbError;

            toast({
                title: "Documento adicionado!",
                description: "Regra publicada com sucesso."
            });

            setIsDialogOpen(false);
            setFormData({ title: "", description: "", file: null });
            fetchRules();

        } catch (error: any) {
            console.error(error);
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, fileUrl: string) => {
        if (!confirm("Tem certeza que deseja excluir este documento?")) return;

        try {
            // Optimistically we could delete file from storage too, but for now just DB record
            // Extract path from URL if needed for storage delete

            const { error } = await supabase
                .from("company_rules")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast({ title: "Documento excluído" });
            fetchRules();
        } catch (error: any) {
            toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
        }
    };

    const filteredRules = rules.filter(rule =>
        rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rule.description && rule.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-blue-600" />
                        Regras e Diretrizes da Empresa
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Acesse os regulamentos internos e documentos importantes
                    </p>
                </div>

                {canManage && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Novo Documento
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Regra ou Diretriz</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Título</label>
                                    <Input
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Ex: Regulamento Interno 2024"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Descrição (Opcional)</label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Breve descrição do documento..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Arquivo (PDF, DOCX, TXT)</label>
                                    <Input
                                        type="file"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <Button className="w-full" onClick={handleUpload} disabled={submitting || uploading}>
                                    {uploading ? "Enviando..." : "Publicar Documento"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Buscar documentos..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRules.map((rule) => (
                    <Card key={rule.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-start justify-between gap-2">
                                <span className="truncate" title={rule.title}>{rule.title}</span>
                                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">
                                {rule.description || "Sem descrição."}
                            </p>
                            <div className="text-xs text-gray-400 mb-4">
                                Publicado em: {format(new Date(rule.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1 gap-2" asChild>
                                    <a href={rule.file_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4" />
                                        Visualizar
                                    </a>
                                </Button>
                                {canManage && (
                                    <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => handleDelete(rule.id, rule.file_url)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {filteredRules.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        Nenhum documento encontrado.
                    </div>
                )}
            </div>
        </div>
    );
}
