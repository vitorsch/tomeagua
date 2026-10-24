"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Droplet,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Sparkles,
  Award,
  Settings2,
  GlassWater
} from "lucide-react";

interface Intake {
  id: string;
  amount: number;
  timestamp: string; // ISO string for reliable serialization
}

const PRESET_VOLUMES = [
  { label: "Copo Pequeno", amount: 150, hint: "150 ml" },
  { label: "Copo Padrão", amount: 250, hint: "250 ml" },
  { label: "Copo Grande", amount: 350, hint: "350 ml" },
  { label: "Garrafinha", amount: 500, hint: "500 ml" },
];

export default function Home() {
  const [intakeAmount, setIntakeAmount] = useState<number | string>("");
  const [intakeHistory, setIntakeHistory] = useState<Intake[]>([]);
  const [dailyGoal, setDailyGoal] = useState<number>(2000);
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [customGoalInput, setCustomGoalInput] = useState<string>("2000");
  const [isClientLoaded, setIsClientLoaded] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load stored history and goal
    try {
      const storedHistory = localStorage.getItem("intakeHistory");
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        // Ensure every item has a unique id and timestamp string
        const normalized = parsed.map((item: any, idx: number) => ({
          id: item.id || `legacy-${idx}-${Date.now()}`,
          amount: Number(item.amount) || 0,
          timestamp: typeof item.timestamp === "string" ? item.timestamp : new Date(item.timestamp).toISOString(),
        }));
        setIntakeHistory(normalized);
      }

      const storedGoal = localStorage.getItem("waterDailyGoal");
      if (storedGoal) {
        const parsedGoal = parseInt(storedGoal, 10);
        if (!isNaN(parsedGoal) && parsedGoal > 0) {
          setDailyGoal(parsedGoal);
          setCustomGoalInput(parsedGoal.toString());
        }
      }
    } catch {
      // In case of parsing error, start fresh
    } finally {
      setIsClientLoaded(true);
    }
  }, []);

  const saveHistory = (newHistory: Intake[]) => {
    setIntakeHistory(newHistory);
    try {
      localStorage.setItem("intakeHistory", JSON.stringify(newHistory));
    } catch (e) {
      console.error("Falha ao salvar no armazenamento local", e);
    }
  };

  const handleAddIntake = (amountToAdd?: number) => {
    const value = amountToAdd !== undefined ? amountToAdd : (typeof intakeAmount === "number" ? intakeAmount : parseFloat(intakeAmount as string));

    if (!value || isNaN(value) || value <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "Por favor, informe um valor válido em mililitros (ex: 250).",
        variant: "destructive",
      });
      return;
    }

    if (value > 5000) {
      toast({
        title: "Valor muito alto",
        description: "Por segurança, insira valores menores que 5.000 ml por registro.",
        variant: "destructive",
      });
      return;
    }

    const newEntry: Intake = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      amount: Math.round(value),
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [newEntry, ...intakeHistory];
    saveHistory(updatedHistory);
    setIntakeAmount("");

    toast({
      title: "Água registrada!",
      description: `${Math.round(value)} ml adicionados com sucesso ao seu consumo de hoje.`,
    });
  };

  const handleDeleteItem = (id: string, amount: number) => {
    const updated = intakeHistory.filter((item) => item.id !== id);
    saveHistory(updated);
    toast({
      title: "Registro removido",
      description: `${amount} ml foram removidos do histórico.`,
    });
  };

  const handleClearHistory = () => {
    localStorage.removeItem("intakeHistory");
    setIntakeHistory([]);
    toast({
      title: "Histórico limpo",
      description: "Todos os registros de consumo foram apagados.",
    });
  };

  const handleSaveGoal = () => {
    const parsed = parseInt(customGoalInput, 10);
    if (isNaN(parsed) || parsed < 500 || parsed > 10000) {
      toast({
        title: "Meta inválida",
        description: "Defina uma meta diária entre 500 ml e 10.000 ml.",
        variant: "destructive",
      });
      return;
    }
    setDailyGoal(parsed);
    localStorage.setItem("waterDailyGoal", parsed.toString());
    setIsEditingGoal(false);
    toast({
      title: "Meta atualizada!",
      description: `Sua nova meta diária é de ${parsed} ml de água.`,
    });
  };

  // Calculate daily intake
  const todaysIntakes = useMemo(() => {
    const now = new Date();
    return intakeHistory.filter((item) => {
      const itemDate = new Date(item.timestamp);
      return (
        itemDate.getDate() === now.getDate() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear()
      );
    });
  }, [intakeHistory]);

  const dailyTotal = useMemo(() => {
    return todaysIntakes.reduce((sum, item) => sum + item.amount, 0);
  }, [todaysIntakes]);

  const progressPercentage = Math.min(100, Math.round((dailyTotal / dailyGoal) * 100));

  const formatItemTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  const formatItemDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return "Hoje";
      }
      if (date.toDateString() === yesterday.toDateString()) {
        return "Ontem";
      }
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    } catch {
      return "";
    }
  };

  const motivationalMessage = useMemo(() => {
    if (dailyTotal === 0) return "Comece o dia se hidratando! Dê o primeiro gole. 💧";
    if (dailyTotal < dailyGoal * 0.4) return "Bom início! Continue bebendo água ao longo do dia.";
    if (dailyTotal < dailyGoal * 0.8) return "Você está no caminho certo! Já passou da metade da meta.";
    if (dailyTotal < dailyGoal) return "Quase lá! Faltam apenas alguns goles para bater a meta.";
    return "Parabéns! Meta diária de hidratação atingida! 🎉";
  }, [dailyTotal, dailyGoal]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">
        {/* App Header */}
        <header className="text-center space-y-1">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-cyan-100 text-cyan-700 shadow-sm mb-2">
            <Droplet className="h-8 w-8 fill-cyan-500 text-cyan-600" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            TomeÁgua
          </h1>
          <p className="text-sm text-slate-600">
            Acompanhe e registre seu consumo diário de água
          </p>
        </header>

        {/* Daily Summary Card */}
        <Card className="border-cyan-100 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-cyan-600" />
                <CardTitle className="text-lg">Resumo Diário</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingGoal(!isEditingGoal)}
                className="text-xs text-slate-600 hover:text-cyan-700 h-8 px-2"
                title="Ajustar meta"
              >
                <Settings2 className="h-4 w-4 mr-1" />
                Meta: {dailyGoal} ml
              </Button>
            </div>
            <CardDescription className="text-xs">
              {motivationalMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingGoal && (
              <div className="p-3 bg-cyan-50/60 rounded-lg border border-cyan-200/80 space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Definir nova meta diária (ml):
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="500"
                    max="10000"
                    step="50"
                    placeholder="Ex: 2500"
                    value={customGoalInput}
                    onChange={(e) => setCustomGoalInput(e.target.value)}
                    className="bg-white h-9 text-sm"
                  />
                  <Button size="sm" onClick={handleSaveGoal} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingGoal(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-3xl font-bold text-slate-900">
                  {isClientLoaded ? dailyTotal : 0}
                </span>
                <span className="text-sm font-medium text-slate-500 ml-1">
                  / {dailyGoal} ml
                </span>
              </div>
              <span className="text-sm font-semibold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-200">
                {isClientLoaded ? progressPercentage : 0}% concluído
              </span>
            </div>

            <Progress value={isClientLoaded ? progressPercentage : 0} className="h-3 bg-slate-100" />

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-md">
                <Calendar className="h-4 w-4 text-cyan-600 shrink-0" />
                <span>Hoje: {isClientLoaded ? todaysIntakes.length : 0} registro(s)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-md">
                <Award className="h-4 w-4 text-cyan-600 shrink-0" />
                <span>
                  Faltam: {isClientLoaded ? Math.max(0, dailyGoal - dailyTotal) : dailyGoal} ml
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Navigation */}
        <Tabs defaultValue="register" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-200/70 p-1 rounded-xl">
            <TabsTrigger value="register" className="rounded-lg py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Droplet className="h-4 w-4 mr-2 text-cyan-600" />
              Registrar
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <History className="h-4 w-4 mr-2 text-cyan-600" />
              Histórico ({isClientLoaded ? intakeHistory.length : 0})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: REGISTRAR */}
          <TabsContent value="register" className="space-y-4 pt-2">
            {/* Quick Presets */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GlassWater className="h-4 w-4 text-cyan-600" />
                  Atalhos Rápidos
                </CardTitle>
                <CardDescription className="text-xs">
                  Toque para registrar uma medida comum rapidamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_VOLUMES.map((preset) => (
                    <Button
                      key={preset.amount}
                      variant="outline"
                      onClick={() => handleAddIntake(preset.amount)}
                      className="h-auto py-3 px-2 flex flex-col items-center justify-center hover:border-cyan-500 hover:bg-cyan-50/50 transition-colors"
                    >
                      <span className="text-xs font-semibold text-slate-800">
                        {preset.label}
                      </span>
                      <span className="text-sm font-bold text-cyan-600 mt-0.5">
                        +{preset.hint}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom Amount Form */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-cyan-600" />
                  Quantidade Personalizada
                </CardTitle>
                <CardDescription className="text-xs">
                  Digite a quantidade exata de água consumida
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddIntake();
                  }}
                  className="space-y-3"
                >
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        min="1"
                        max="5000"
                        step="10"
                        placeholder="Digite a quantidade em ml"
                        value={intakeAmount}
                        onChange={(e) => setIntakeAmount(e.target.value)}
                        className="pr-12 text-base"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                        ml
                      </span>
                    </div>
                    <Button
                      type="submit"
                      className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium px-4 shrink-0"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: HISTÓRICO */}
          <TabsContent value="history" className="space-y-4 pt-2">
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4 text-cyan-600" />
                      Histórico de Consumo
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Lista de todas as ingestões registradas
                    </CardDescription>
                  </div>
                  {intakeHistory.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-8 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Limpar tudo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação é permanente e apagará todos os seus registros de água salvos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearHistory}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Sim, apagar tudo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {intakeHistory.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400">
                      <Droplet className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      Nenhum registro ainda
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Você ainda não registrou nenhum consumo de água. Vá para a aba &quot;Registrar&quot; para começar a acompanhar.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-80 w-full pr-3">
                    <div className="space-y-2">
                      {intakeHistory.map((intake) => (
                        <div
                          key={intake.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-full bg-cyan-100 text-cyan-700 shrink-0">
                              <Droplet className="h-4 w-4 fill-cyan-500 text-cyan-600" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {intake.amount} ml
                              </div>
                              <div className="text-xs text-slate-500">
                                {formatItemDate(intake.timestamp)} às {formatItemTime(intake.timestamp)}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(intake.id, intake.amount)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Remover este registro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer info */}
        <footer className="text-center text-xs text-slate-400 pt-2">
          <p>TomeÁgua • Mantenha-se hidratado e saudável todos os dias</p>
        </footer>
      </div>
    </main>
  );
}
