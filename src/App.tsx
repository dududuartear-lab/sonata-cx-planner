/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, Legend
} from 'recharts';
import {
  Users, TrendingUp, AlertTriangle, Sparkles,
  Building2, Timer, FileText, Layout, Headset, MousePointer2,
  Mail, ArrowLeft, Download, FileDown, Clock
} from 'lucide-react';

/**
 * SONATA CX CAPACITY PLANNER - v5.0
 * - Lógica de HC reformulada: apenas TMA (min) por canal, proporcional ao volume
 * - Toggle de canal ativo/inativo (TMA=0 também desativa)
 * - Novo gráfico: analistas necessários por hora (barras empilhadas por canal)
 * - Corrigido bug do card "Equipa Necessária" (conflito de classe bg-)
 * - Removido TME e SLA de Reabertura da sidebar
 */

const CHART_COLORS = ['#4F46E5','#818CF8','#C7D2FE','#312E81','#6366F1','#4338CA','#1E1B4B','#A5B4FC'];
const WEEKDAYS     = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DAY_LABELS   = ['D','S','T','Q','Q','S','S'];
const DAY_FULL     = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const CHANNEL_COLORS = { telefone:'#4F46E5', chat:'#818CF8', email:'#C7D2FE' };

function countWorkingDaysInMonth(yearMonth: string, operationDays: number[]): number {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (operationDays.includes(new Date(year, month - 1, d).getDay())) count++;
  }
  return Math.max(count, 1);
}

interface TicketData {
  id_ticket?: string; data_hora_entrada?: string; client_id?: string;
  canal?: string; assunto?: string; motivo?: string;
  isValidDate: boolean; dateObj: Date; yearMonth: string; hour: number; day: number;
  [key: string]: any;
}

interface ConfigState {
  companyMarket: string;
  teamSize: number | string;
  shiftHours: number | string;
  breakMinutes: number | string;
  operationDays: number[];
  operationStartHour: number | string;
  operationEndHour: number | string;
  phoneEnabled: boolean; phoneAHT: number | string;
  chatEnabled: boolean;  chatAHT: number | string; chatConcurrency: number | string;
  emailEnabled: boolean; emailAHT: number | string;
}

interface HourlyPoint {
  hour: string; telefone: number; chat: number; email: number; total: number;
}

interface StatsType {
  total: number; avgDailyVolLastMonth: number; workingDaysInLastMonth: number;
  growth: number;
  monthlyTrend: { month: string; volume: number; telefone: number; chat: number; email: number }[];
  globalFCR: number; fcrTrend: { month: string; rate: number }[];
  hcIdeal: number; hcDist: { phone: number; chat: number; email: number };
  // HC "bruto" antes do fator de cobertura (para referência)
  hcBase: number;
  // Fator de cobertura: operationDays.length / 5 (mínimo 1)
  // Garante que analistas com folgas cubram todos os dias de operação
  coverageFactor: number;
  pDist: { phone: number; chat: number; email: number };
  subjectsMap: Record<string, { total: number; motives: Record<string, number> }>;
  pieSubjects: { name: string; value: number }[];
  heatmapGrid: number[][]; maxHeatmapVal: number;
  hourlyStaffing: HourlyPoint[];
}

const defaultStats: StatsType = {
  total:0, avgDailyVolLastMonth:0, workingDaysInLastMonth:0, growth:0,
  monthlyTrend:[], globalFCR:0, fcrTrend:[],
  hcIdeal:0, hcDist:{phone:0,chat:0,email:0}, hcBase:0, coverageFactor:1,
  pDist:{phone:0,chat:0,email:0},
  subjectsMap:{}, pieSubjects:[],
  heatmapGrid:Array(7).fill(null).map(()=>Array(24).fill(0)),
  maxHeatmapVal:0, hourlyStaffing:[]
};

export default function App() {
  const apiKey = import.meta.env.VITE_SONATA_API;

  const [rawData, setRawData]                     = useState<TicketData[]>([]);
  const [isLoaded, setIsLoaded]                   = useState(false);
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  const [isAiLoading, setIsAiLoading]             = useState(false);
  const [aiReport, setAiReport]                   = useState("");
  const [isAiError, setIsAiError]                 = useState(false);
  const [selectedSubject, setSelectedSubject]     = useState<string | null>(null);

  const [config, setConfig] = useState<ConfigState>({
    companyMarket: "", teamSize: 50, shiftHours: 8, breakMinutes: 60,
    operationDays: [1,2,3,4,5], operationStartHour: 8, operationEndHour: 18,
    phoneEnabled: true,  phoneAHT: 5,
    chatEnabled: true,   chatAHT: 8, chatConcurrency: 3,
    emailEnabled: true,  emailAHT: 3,
  });

  const toggleDay = (idx: number) => {
    const updated = config.operationDays.includes(idx)
      ? config.operationDays.filter((d:number) => d !== idx)
      : [...config.operationDays, idx].sort((a:number,b:number) => a-b);
    if (updated.length === 0) return;
    setConfig({...config, operationDays: updated});
  };

  const handleDownloadTemplate = () => {
    const csv = "id_ticket;data_hora_entrada;client_id;canal;assunto;motivo\n" +
      "TKT-005018;01/01/2025 00:08;CLI-18980;chat;logistica;atraso\n" +
      "TKT-001351;01/01/2025 00:11;CLI-13328;email;pagamento;contestacao\n" +
      "TKT-009209;01/01/2025 00:12;CLI-15635;telefone;logistica;atraso";
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'template_sonata_cx.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleImport = (e: any) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      const text = event.target?.result as string; if (!text) return;
      const lines = text.split('\n');
      if (lines.length < 2) { alert("Ficheiro vazio ou inválido."); return; }
      const delim = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(delim).map((h:string) => h.trim().toLowerCase().replace(/["']/g,''));
      const parsed = lines.slice(1)
        .filter((l:string) => l.replace(/[;,]/g,'').trim() !== "")
        .map((line:string) => {
          const rx = new RegExp(`${delim}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
          const vals = line.split(rx);
          const row: Record<string,any> = {};
          headers.forEach((h:string,i:number) => { row[h] = vals[i] ? vals[i].trim().replace(/^["']|["']$/g,'') : ""; });
          let dt = new Date(row.data_hora_entrada);
          if (Number.isNaN(dt.getTime()) && row.data_hora_entrada) {
            const p = row.data_hora_entrada.split(/[\s/:]+/);
            if (p.length >= 5) dt = new Date(`${p[2]}-${p[1]}-${p[0]}T${p[3]}:${p[4]}:00`);
          }
          row.isValidDate = !Number.isNaN(dt.getTime());
          if (row.isValidDate) {
            row.dateObj   = dt;
            row.yearMonth = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
            row.hour = dt.getHours(); row.day = dt.getDay();
          }
          return row as TicketData;
        }).filter((r:any) => r.isValidDate);
      if (parsed.length === 0) { alert("Nenhuma linha com data válida encontrada."); return; }
      setRawData(parsed); setIsLoaded(true); setIsReportGenerated(false);
      setSelectedSubject(null); setAiReport("");
    };
    reader.readAsText(file); e.target.value = '';
  };

  const stats = useMemo<StatsType>(() => {
    if (!rawData.length) return defaultStats;

    // ── Tendência mensal por canal ──────────────────────────────────────────
    const monthMap: Record<string,number> = {};
    const mChan:    Record<string,{telefone:number;chat:number;email:number}> = {};
    rawData.forEach((d:TicketData) => {
      monthMap[d.yearMonth] = (monthMap[d.yearMonth]||0)+1;
      if (!mChan[d.yearMonth]) mChan[d.yearMonth] = {telefone:0,chat:0,email:0};
      const c = d.canal?.toLowerCase()||'';
      if (c==='telefone') mChan[d.yearMonth].telefone++;
      else if (c==='chat') mChan[d.yearMonth].chat++;
      else if (c==='email') mChan[d.yearMonth].email++;
    });
    const monthlyTrend = Object.keys(monthMap).sort().map((k:string) => ({
      month:k, volume:monthMap[k],
      telefone: mChan[k]?.telefone||0, chat: mChan[k]?.chat||0, email: mChan[k]?.email||0,
    }));

    let growth = 0;
    if (monthlyTrend.length > 1) {
      const fv = monthlyTrend[0].volume, lv = monthlyTrend[monthlyTrend.length-1].volume, n = monthlyTrend.length;
      if (fv>0 && n>1) growth = Math.pow(lv/fv, 1/(n-1))-1;
    }

    // ── Último mês ──────────────────────────────────────────────────────────
    const monthsKeys   = Object.keys(monthMap).sort();
    const lastMonthKey = monthsKeys[monthsKeys.length-1];
    const lmData: TicketData[] = rawData.filter((d:TicketData) => d.yearMonth===lastMonthKey);

    const lmChan = lmData.reduce((acc:Record<string,number>,d:TicketData) => {
      const c = d.canal?.toLowerCase()||'outros'; acc[c]=(acc[c]||0)+1; return acc;
    }, {telefone:0,chat:0,email:0});

    const workingDaysInLastMonth = countWorkingDaysInMonth(lastMonthKey, config.operationDays);
    const avgDailyVolLastMonth   = lmData.length / workingDaysInLastMonth;
    const total = lmData.length||1;

    // Proporções de volume por canal no último mês
    const pPhone = lmChan.telefone / total;
    const pChat  = lmChan.chat     / total;
    const pEmail = lmChan.email    / total;

    // ── Parâmetros de produtividade (somente TMA em minutos) ────────────────
    const phoneActive = config.phoneEnabled && Number(config.phoneAHT) > 0;
    const chatActive  = config.chatEnabled  && Number(config.chatAHT)  > 0;
    const emailActive = config.emailEnabled && Number(config.emailAHT) > 0;

    const tmPhone = phoneActive ? Number(config.phoneAHT) : 0;  // minutos
    const tmChat  = chatActive  ? Number(config.chatAHT)  : 0;  // minutos
    const tmEmail = emailActive ? Number(config.emailAHT) : 0;  // minutos
    const conc    = Number(config.chatConcurrency)||1;

    // Tempo líquido de trabalho por agente por dia (em minutos)
    const netWorkMin = Math.max(1, (Number(config.shiftHours)||8)*60 - (Number(config.breakMinutes)||0));

    // Carga de trabalho diária em minutos por canal:
    //   Telefone/Email: 1 atendimento por vez → vol × TMA
    //   Chat: simultaneidade → (vol / conc) × TMA
    const wlPhoneMin = (avgDailyVolLastMonth * pPhone) * tmPhone;
    const wlChatMin  = ((avgDailyVolLastMonth * pChat) / conc) * tmChat;
    const wlEmailMin = (avgDailyVolLastMonth * pEmail) * tmEmail;

    // HC por canal com fator de ocupação de 82%
    // hcBase = analistas para cobrir a DEMANDA de um único dia de operação
    const hcPhoneBase = phoneActive ? Math.ceil((wlPhoneMin / netWorkMin) / 0.82) : 0;
    const hcChatBase  = chatActive  ? Math.ceil((wlChatMin  / netWorkMin) / 0.82) : 0;
    const hcEmailBase = emailActive ? Math.ceil((wlEmailMin / netWorkMin) / 0.82) : 0;
    const hcBase = hcPhoneBase + hcChatBase + hcEmailBase;

    // ── Fator de cobertura de folgas (escala 5×2) ───────────────────────────
    // Cada analista trabalha 5 dias/semana e folga 2.
    // Se a operação roda N dias/semana (N > 5), precisamos de N/5 vezes mais
    // analistas para que todos os dias estejam cobertos quando uns estão de folga.
    // Ex: operação 7 dias → fator 7/5 = 1,40 → +40% de headcount.
    // Ex: operação 6 dias → fator 6/5 = 1,20 → +20% de headcount.
    // Ex: operação 5 dias → fator 5/5 = 1,00 → sem acréscimo.
    // Ex: operação ≤ 4 dias → todos os analistas conseguem cobrir todos os dias
    //     sem sobreposição, portanto fator = 1 (sem acréscimo).
    const coverageFactor = Math.max(config.operationDays.length / 5, 1);

    const hcPhone = Math.ceil(hcPhoneBase * coverageFactor);
    const hcChat  = Math.ceil(hcChatBase  * coverageFactor);
    const hcEmail = Math.ceil(hcEmailBase * coverageFactor);
    const hcIdeal = hcPhone + hcChat + hcEmail;

    // ── Recontato (FCR) ─────────────────────────────────────────────────────
    const sorted = [...rawData].sort((a,b) => a.dateObj.getTime()-b.dateObj.getTime());
    const clientHistory = new Map<string,Date>();
    const rcByMonth: Record<string,{total:number;recontacts:number}> = {};
    let totalRecontacts = 0;
    sorted.forEach((t:TicketData) => {
      if (!t.client_id) return;
      const key = `${t.client_id}-${t.assunto}`;
      if (!rcByMonth[t.yearMonth]) rcByMonth[t.yearMonth] = {total:0,recontacts:0};
      rcByMonth[t.yearMonth].total++;
      if (clientHistory.has(key)) {
        const diff = (t.dateObj.getTime()-(clientHistory.get(key)?.getTime()||0))/(1000*3600*24);
        if (diff<=14) { totalRecontacts++; rcByMonth[t.yearMonth].recontacts++; }
      }
      clientHistory.set(key, t.dateObj);
    });
    const fcrTrend = Object.keys(rcByMonth).sort().map((m:string) => ({
      month:m, rate:parseFloat(((rcByMonth[m].recontacts/Math.max(rcByMonth[m].total,1))*100).toFixed(1))
    }));
    const globalFCR = rawData.length>0 ? (totalRecontacts/rawData.length)*100 : 0;

    // ── Assuntos / Motivos ──────────────────────────────────────────────────
    const subjectsMap: Record<string,{total:number;motives:Record<string,number>}> = {};
    rawData.forEach((d:TicketData) => {
      const ass = d.assunto||'Não Classificado', mot = d.motivo||'Não Classificado';
      if (!subjectsMap[ass]) subjectsMap[ass] = {total:0,motives:{}};
      subjectsMap[ass].total++;
      subjectsMap[ass].motives[mot] = (subjectsMap[ass].motives[mot]||0)+1;
    });
    const pieSubjects = Object.keys(subjectsMap)
      .map((k:string) => ({name:k,value:subjectsMap[k].total}))
      .sort((a:any,b:any) => b.value-a.value);

    // ── Heatmap geral ───────────────────────────────────────────────────────
    const heatmapGrid = Array(7).fill(null).map(()=>Array(24).fill(0));
    let maxHeatmapVal = 0;
    rawData.forEach((d:TicketData) => {
      heatmapGrid[d.day][d.hour]++;
      if (heatmapGrid[d.day][d.hour]>maxHeatmapVal) maxHeatmapVal=heatmapGrid[d.day][d.hour];
    });

    // ── Staffing por hora (baseado no padrão do último mês) ─────────────────
    const lmHeatmap = Array(7).fill(null).map(()=>Array(24).fill(0));
    lmData.forEach((d:TicketData) => { lmHeatmap[d.day][d.hour]++; });

    const startH  = Number(config.operationStartHour)||8;
    const endH    = Number(config.operationEndHour)  ||18;
    const opDays  = config.operationDays;

    const hourlyStaffing: HourlyPoint[] = [];
    for (let h = startH; h < endH; h++) {
      // Volume médio nesta hora = total desta hora nos dias de op / dias úteis do mês
      let hourTotal = 0;
      for (const d of opDays) hourTotal += lmHeatmap[d][h];
      const avgHourVol = hourTotal / workingDaysInLastMonth;

      // Analistas: vol × TMA(min) / 60 → horas de trabalho necessárias naquela hora
      // dividido por ocupação 82%
      const agPhone = phoneActive && tmPhone>0
        ? Math.ceil((avgHourVol*pPhone*tmPhone/60)/0.82) : 0;
      const agChat  = chatActive  && tmChat>0
        ? Math.ceil((avgHourVol*pChat*tmChat/60/conc)/0.82) : 0;
      const agEmail = emailActive && tmEmail>0
        ? Math.ceil((avgHourVol*pEmail*tmEmail/60)/0.82) : 0;

      hourlyStaffing.push({
        hour: `${String(h).padStart(2,'0')}h`,
        telefone: agPhone, chat: agChat, email: agEmail,
        total: agPhone+agChat+agEmail
      });
    }

    return {
      total: rawData.length,
      avgDailyVolLastMonth: Math.round(avgDailyVolLastMonth),
      workingDaysInLastMonth, growth, monthlyTrend, globalFCR, fcrTrend,
      hcIdeal, hcBase, coverageFactor,
      hcDist:{phone:hcPhone,chat:hcChat,email:hcEmail},
      pDist:{phone:Math.round(pPhone*100),chat:Math.round(pChat*100),email:Math.round(pEmail*100)},
      subjectsMap, pieSubjects, heatmapGrid, maxHeatmapVal, hourlyStaffing
    };
  }, [rawData, config]);

  const s: StatsType = stats||defaultStats;

  const getHcColorConfig = () => {
    if (s.total===0) return {text:'text-slate-900',bg:'bg-slate-100',icon:'text-slate-500'};
    const ratio = s.hcIdeal/(Number(config.teamSize)||1);
    if (ratio>1.15) return {text:'text-rose-500',  bg:'bg-rose-50',   icon:'text-rose-400'};
    if (ratio>1.0)  return {text:'text-amber-500', bg:'bg-amber-50',  icon:'text-amber-400'};
    return              {text:'text-emerald-500',bg:'bg-emerald-50',icon:'text-emerald-400'};
  };

  const handlePieClick = (data: any) => { if (!selectedSubject && data?.name) setSelectedSubject(data.name); };

  const currentPieData = useMemo(() => {
    if (s.total===0) return [];
    if (!selectedSubject) return s.pieSubjects||[];
    const motives = s.subjectsMap[selectedSubject]?.motives||{};
    return Object.keys(motives).map((k:string)=>({name:k,value:motives[k]})).sort((a:any,b:any)=>b.value-a.value);
  }, [s, selectedSubject]);

  const getHeatmapColor = (val:number, max:number) => {
    if (val===0||!max) return '#f1f5f9';
    return `hsl(${(1-Math.max(0,Math.min(1,val/max)))*200},90%,60%)`;
  };

  const generateReportAndAI = async () => {
    setIsReportGenerated(true); setIsAiLoading(true); setIsAiError(false); setAiReport("");
    const activeChannels = [
      config.phoneEnabled && Number(config.phoneAHT)>0 ? `Telefone (TMA: ${config.phoneAHT} min)` : null,
      config.chatEnabled  && Number(config.chatAHT) >0 ? `Chat (TMA: ${config.chatAHT} min, simultaneidade: ${config.chatConcurrency}x)` : null,
      config.emailEnabled && Number(config.emailAHT)>0 ? `E-mail (TMA: ${config.emailAHT} min)` : null,
    ].filter(Boolean).join(', ');
    const opDaysLabel = config.operationDays.map((d:number) => DAY_FULL[d]).join(', ');
    const peakHour = s.hourlyStaffing.reduce((best,cur) => cur.total>best.total ? cur : best, {hour:'-',total:0,telefone:0,chat:0,email:0});

    const weeklyHours = Number(config.shiftHours) === 8 ? '40h' : Number(config.shiftHours) === 6 ? '30h' : '20h';
    const coverageFactor = s.coverageFactor;
    const coveragePct = ((s.coverageFactor - 1) * 100).toFixed(0);

    const prompt = `
[INSTRUÇÃO DE SISTEMA]: Você é um consultor sênior da Sonata.cx. Use formatação Markdown.

Atue como Consultor de CX Sênior com foco em Workforce Management (WFM).

DADOS DA OPERAÇÃO:
- Mercado: ${config.companyMarket}
- Dias de operação: ${opDaysLabel} | Horário: ${config.operationStartHour}h às ${config.operationEndHour}h
- Headcount Atual: ${config.teamSize} analistas
- Headcount Ideal Calculado (apenas TMA, inclui fator de cobertura de folgas ${coverageFactor.toFixed(2)}×): ${s.hcIdeal} analistas
  → Voz: ${s.hcDist.phone} | Chat: ${s.hcDist.chat} | E-mail: ${s.hcDist.email}
  → Headcount base sem fator de cobertura: ${s.hcBase} analistas (${coveragePct}% adicionado para cobrir folgas 5×2)
- Canais ativos e TMA: ${activeChannels}
- Volume por canal: Telefone ${s.pDist.phone}% | Chat ${s.pDist.chat}% | E-mail ${s.pDist.email}%
- Volume Médio Diário (dias úteis): ${s.avgDailyVolLastMonth} tickets/dia (${s.workingDaysInLastMonth} dias úteis)
- Crescimento Mensal Médio: ${(s.growth*100).toFixed(1)}%
- Taxa de Recontato (14 dias): ${s.globalFCR.toFixed(1)}%
- Hora de pico: ${peakHour.hour} (${peakHour.total} analistas simultâneos)
- Jornada dos analistas: ${config.shiftHours}h/dia | ${weeklyHours} semanais | Escala 5×2

REGRAS DO RELATÓRIO:

Seja direto e executivo. Não coloque [nome da empresa], [nome da pessoa] nem nenhum tipo de identificação, porque este relatório será apresentado ao cliente diretamente na tela, então não se comporte como se fosse um e-mail ou um documento a ser enviado.

1. Considere que a escala foi calculada considerando o headcount em escala 5×2 (todos os analistas folgam 2 dias por semana) para fins de escala. Caso esta não seja a realidade daquela operação, é papel do gestor de CX avaliar a aderência que aqueles dados têm com o seu dia-a-dia.
2. O headcount foi calculado SOMENTE com base no TMA (Tempo Médio de Atendimento) informado por canal. Destaque que melhorias de TMA (treinamento, ferramentas de IA assistiva, base de conhecimento, processos) têm impacto direto e imediato na produtividade — um time com baixa maturidade ou muitos novatos terá TMA maior, o que eleva a necessidade de HC.
3. Explique as peculiaridades de cada canal: E-mail pode ter TMA curto e pode ser processado em lote, sendo o canal mais eficiente por agente, mas e-mail também pode ser um canal de TMA longo, a depender das ferramentas, nível de dúvidas e complexidade do processo para a resolução. É preciso que seja feita uma análise que leve em conta qual a realidade da empresa para aquele canal. Chat depende do tempo de resposta do cliente, mas favorece a simultaneidade. Telefone é o canal de maior custo unitário (1 analista por chamada). Explique que a escolha dos canais passa pela estratégia de favorecer um ou outro canal conforme estratégia macro da área e da empresa.
4. SE (HC Ideal) > (Atual + 15%): recomende automação e self-service (Tier 0/1) antes de contratar. Explique que contratações levam tempo para começar a performar, além de ser pouco escalável. Melhorias de tecnologia são geralmente caras e demoradas, mas muito escaláveis; melhorias de processos podem ser rápidas e razoavelmente escaláveis.
5. SE (HC ATUAL) > (HC Ideal) E Crescimento > 10%: Explique que o headcount atual é maior que o necessário e questione se tem alguma justificativa para isso, como um crescimento previsto maior que a média dos últimos meses. Informe em quanto tempo, pela taxa de crescimento atual, o headcount seria suficiente para segurar a operação. Reforce que este é um ótimo momento para que a operação se preocupe com o treinamento e qualidade dos analistas, e que métricas como CSAT, NPS e outras métricas de qualidade devem ser priorizadas para a excelência.
6. SE HC equilibrado E Crescimento < 10%: foque em qualidade, melhorias de processos e redução de TMA.
7. SE (HC ATUAL) for muito maior que (HC Ideal) (superior a 15%), aponte como um ponto de atenção no dimensionamento e sugira uma revisão nas funções e serviços executados por cada analista.
8. Comente sobre a hora de pico (${peakHour.hour}) e como isso impacta a gestão de escalas e turnos.
9. Mencione que o dashboard já inclui um gráfico de analistas necessários por hora, por canal — uma ferramenta prática para montar turnos.
10. Venda discretamente a Sonata.cx no final como parceira estratégica de CX para WFM e outras demandas de CX.
    `;
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}]})
      });
      const rt = await resp.text();
      if (!resp.ok) throw new Error(`[Erro HTTP ${resp.status}] ${rt.substring(0,200)}`);
      let data: any;
      try { data = JSON.parse(rt); } catch { throw new Error(`Falha ao parsear resposta: ${rt.substring(0,200)}`); }
      if (data.error) throw new Error(data.error.message);
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) throw new Error("A API não retornou conteúdo de texto.");
      setAiReport(aiText);
    } catch (e: any) {
      setIsAiError(true);
      if (e?.message?.includes('Failed to fetch')||e?.message?.includes('NetworkError')) {
        setAiReport(`### Bloqueio de Rede 🛡️\n\nA requisição foi bloqueada. Verifique AdBlock ou firewalls.\n\n*(Detalhe: \`${e?.message}\`)*`);
      } else {
        setAiReport(`### Falha na API ⚠️\n\n**Detalhe:**\n\`\`\`\n${e?.message}\n\`\`\``);
      }
    } finally { setIsAiLoading(false); }
  };

  const CustomTooltip = (props: any) => {
    const {active,payload,label} = props;
    if (!active||!payload?.length) return null;
    return (
      <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((p:any,i:number) => (
          <p key={i} className="text-sm font-semibold" style={{color:p.color||p.fill}}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  const renderPieLabel = (props: any) => {
    const {name,percent} = props;
    if (percent<0.05) return null;
    return `${name} (${(percent*100).toFixed(0)}%)`;
  };

  const hcColors = getHcColorConfig();

  // ── Componente reutilizável para configuração de canal ─────────────────────
  const ChannelCard = ({label, icon, enabled, onToggle, tmaVal, onTma, extra}: {
    label:string; icon:React.ReactNode; enabled:boolean; onToggle:()=>void;
    tmaVal:number|string; onTma:(v:string)=>void; extra?:React.ReactNode;
  }) => (
    <div className={`bg-white p-5 rounded-2xl border shadow-sm transition-all ${enabled?'border-slate-200':'border-slate-100 opacity-50'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-indigo-600">{icon}<span className="text-xs font-black uppercase">{label}</span></div>
        <button onClick={onToggle}
          className={`relative w-11 h-6 rounded-full transition-colors ${enabled?'bg-indigo-600':'bg-slate-200'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled?'translate-x-5':'translate-x-0'}`} />
        </button>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 bg-slate-50 p-3 rounded-xl">
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">TMA (min)</label>
          <input type="number" min={0} step={0.5} disabled={!enabled}
            className="w-full font-black text-base bg-transparent outline-none disabled:text-slate-300"
            value={tmaVal} onChange={(e:any)=>onTma(e.target.value)} />
        </div>
        {extra}
      </div>
      {enabled && Number(tmaVal)===0 && (
        <p className="text-[10px] text-amber-500 mt-2 font-medium">⚠ TMA = 0: canal ignorado no cálculo</p>
      )}
      {!enabled && <p className="text-[10px] text-slate-400 mt-2 font-medium">Canal desativado — excluído do cálculo</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-800 font-sans">

      {/* ────────────────────── SIDEBAR ────────────────────── */}
      <aside className="w-full lg:w-[400px] bg-white border-r border-slate-200 p-8 overflow-y-auto max-h-screen sticky top-0 shadow-lg z-50 flex flex-col">
        <div className="flex flex-col items-center mb-8 pb-6 border-b border-slate-100">
          <div className="bg-indigo-600 p-3 flex items-center justify-center rounded-2xl mb-3 shadow-lg shadow-indigo-200 w-14 h-14">
            <img src="/logo-branca.png" alt="Sonata CX Logo" className="w-8 h-8 object-contain"/>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">sonata.cx <span className="text-indigo-600 italic">lab</span></h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Capacity Planner v5.0</p>
        </div>

        <div className="space-y-8 flex-1">

          {/* Mercado */}
          <section>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Building2 size={16}/> Mercado da Empresa
              </label>
              <input placeholder="Ex: E-commerce, Fintech..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={config.companyMarket}
                onChange={(e:any)=>setConfig({...config,companyMarket:e.target.value})}/>
            </div>
          </section>

          {/* Equipa e Jornada */}
          <section className="space-y-4">
            <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Users size={16}/> Equipa e Jornada</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Equipa Atual</label>
                <input type="number" className="text-xl font-black w-full bg-transparent outline-none"
                  value={config.teamSize} onChange={(e:any)=>setConfig({...config,teamSize:e.target.value===''?'':parseInt(e.target.value)})}/>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Carga Horária</label>
                <select className="text-base font-black w-full bg-transparent outline-none cursor-pointer"
                  value={config.shiftHours} onChange={(e:any)=>setConfig({...config,shiftHours:parseInt(e.target.value)})}>
                  <option value={4}>4h diárias</option>
                  <option value={6}>6h diárias</option>
                  <option value={8}>8h diárias</option>
                </select>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
              <label className="text-xs font-bold text-slate-600 uppercase">Pausa Total (Min)</label>
              <input type="number" className="text-right text-lg font-black w-20 bg-transparent outline-none text-indigo-600"
                value={config.breakMinutes} onChange={(e:any)=>setConfig({...config,breakMinutes:e.target.value===''?'':parseInt(e.target.value)})}/>
            </div>
          </section>

          {/* Horário de Operação */}
          <section className="space-y-4">
            <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Clock size={16}/> Horário de Operação</h3>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3">Dias de Funcionamento</label>
              <div className="flex gap-1 justify-between">
                {DAY_LABELS.map((lbl:string,idx:number) => {
                  const active = config.operationDays.includes(idx);
                  return (
                    <button key={idx} onClick={()=>toggleDay(idx)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${active?'bg-indigo-600 text-white shadow-md shadow-indigo-200':'bg-white border border-slate-200 text-slate-400 hover:border-indigo-300'}`}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                {config.operationDays.length===7?'Operação 7 dias por semana':`${config.operationDays.length} dia(s) por semana`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Início (hora)</label>
                <input type="number" min={0} max={23} className="text-xl font-black w-full bg-transparent outline-none text-indigo-600"
                  value={config.operationStartHour}
                  onChange={(e:any)=>setConfig({...config,operationStartHour:Math.min(23,Math.max(0,parseInt(e.target.value)||0))})}/>
                <span className="text-[10px] text-slate-400">ex: 8 = 08h00</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fim (hora)</label>
                <input type="number" min={1} max={24} className="text-xl font-black w-full bg-transparent outline-none text-indigo-600"
                  value={config.operationEndHour}
                  onChange={(e:any)=>setConfig({...config,operationEndHour:Math.min(24,Math.max(1,parseInt(e.target.value)||18))})}/>
                <span className="text-[10px] text-slate-400">ex: 18 = 18h00</span>
              </div>
            </div>
          </section>

          {/* Canais e TMA */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Timer size={16}/> Canais e TMA</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                TMA em minutos (frações permitidas, ex: 0.5). Canal desativado ou TMA = 0 → ignorado no cálculo de headcount.
              </p>
            </div>

            <ChannelCard label="Voz / Telefone" icon={<Headset size={18}/>}
              enabled={config.phoneEnabled}
              onToggle={()=>setConfig({...config,phoneEnabled:!config.phoneEnabled})}
              tmaVal={config.phoneAHT}
              onTma={(v)=>setConfig({...config,phoneAHT:v===''?'':parseFloat(v)})}
            />

            <ChannelCard label="Chat / Messaging" icon={<MousePointer2 size={18}/>}
              enabled={config.chatEnabled}
              onToggle={()=>setConfig({...config,chatEnabled:!config.chatEnabled})}
              tmaVal={config.chatAHT}
              onTma={(v)=>setConfig({...config,chatAHT:v===''?'':parseFloat(v)})}
              extra={
                <div className="flex-1 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                  <label className="text-[10px] font-black text-indigo-600 uppercase block mb-1">Simult.</label>
                  <select disabled={!config.chatEnabled}
                    className="bg-transparent font-black text-sm outline-none text-indigo-600 w-full disabled:text-slate-300 cursor-pointer"
                    value={config.chatConcurrency}
                    onChange={(e:any)=>setConfig({...config,chatConcurrency:parseInt(e.target.value)})}>
                    {[1,2,3,4,5,6,7,8].map((n:number)=><option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
              }
            />

            <ChannelCard label="E-mail / Tickets" icon={<Mail size={18}/>}
              enabled={config.emailEnabled}
              onToggle={()=>setConfig({...config,emailEnabled:!config.emailEnabled})}
              tmaVal={config.emailAHT}
              onTma={(v)=>setConfig({...config,emailAHT:v===''?'':parseFloat(v)})}
            />
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <button onClick={generateReportAndAI} disabled={!isLoaded||!config.companyMarket}
            className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg transition-all disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-2 active:scale-95">
            {isAiLoading ? "A Analisar..." : <><Layout size={18}/> Gerar Relatório Estratégico</>}
          </button>
        </div>
      </aside>

      {/* ─────────────────────── MAIN ─────────────────────── */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto relative">

        {!isLoaded ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
            <div className="mb-10 flex items-center justify-center hover:scale-105 transition-transform duration-500">
              <img src="/logo-apresentacao.png" alt="Sonata CX" className="h-28 object-contain drop-shadow-sm"/>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Análise de Escala WFM</h2>
            <p className="text-slate-500 mb-10 text-lg">
              Faça o upload do histórico de tickets (CSV) com as colunas:<br/>
              <span className="font-mono text-sm bg-white p-1 rounded">data_hora_entrada, client_id, canal, assunto, motivo</span>
            </p>
            <div className="flex flex-col items-center gap-4 mb-10">
              <div className="relative hover:scale-105 transition-transform">
                <input id="csv-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept=".csv" onChange={handleImport} title="Clique para importar"/>
                <div className="bg-indigo-600 text-white px-10 py-5 rounded-full font-black text-xl shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 cursor-pointer">
                  <FileText size={24}/> Importar Ficheiro CSV
                </div>
              </div>
              <button onClick={handleDownloadTemplate} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors underline underline-offset-4">
                <FileDown size={16}/> Descarregar Planilha de Exemplo (Template)
              </button>
            </div>
            <div className="bg-red-50 border border-red-200 p-6 rounded-2xl max-w-lg mx-auto text-left shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-1" size={24}/>
                <div>
                  <h4 className="text-red-800 font-bold text-sm uppercase tracking-wider mb-2">Aviso de Segurança (LGPD/RGPD)</h4>
                  <p className="text-red-700 text-xs leading-relaxed mb-2">
                    <strong>Não faça upload de informações sensíveis ou dados reais de clientes.</strong> Recomendamos mascarar a coluna <code className="bg-red-100 px-1 py-0.5 rounded font-mono">client_id</code>. Não utilize E-mails, CPFs ou Nomes reais.
                  </p>
                  <p className="text-red-700 text-xs leading-relaxed opacity-90">
                    Os dados brutos são processados localmente no navegador. Apenas KPIs consolidados são enviados à IA (Google Gemini) para geração do parecer.
                  </p>
                </div>
              </div>
            </div>
          </div>

        ) : !isReportGenerated ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <FileText size={32}/>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Ficheiro Importado com Sucesso!</h3>
            <p className="text-slate-500 mb-8 text-lg">
              O ficheiro possui <strong>{s.total.toLocaleString()}</strong> contactos válidos.<br/><br/>
              Preencha o campo <strong>Mercado da Empresa</strong> na barra lateral e clique em <strong>Gerar Relatório Estratégico</strong>.
            </p>
          </div>

        ) : (
          <div className="space-y-8 pb-20 max-w-7xl mx-auto">

            {/* ── KPI CARDS ────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

              {/* Headcount Ideal */}
              <div className="p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group bg-white">
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10 ${hcColors.bg}`}/>
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${hcColors.icon}`}>
                    <Users size={14}/> Headcount Ideal
                  </div>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded">vs {config.teamSize}</span>
                </div>
                <div className={`text-5xl font-black mb-1 ${hcColors.text}`}>{s.hcIdeal}</div>
                <div className="text-[11px] text-slate-500 font-medium">Vol Diário Ref: {s.avgDailyVolLastMonth} tickets</div>
                <div className="text-[10px] text-slate-400 mt-1">{s.workingDaysInLastMonth} dias úteis no mês</div>
              </div>

              {/* Crescimento */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10"/>
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mb-4"><TrendingUp size={14}/> Crescimento (MoM)</div>
                <div className="text-5xl font-black text-slate-900 mb-1">{(s.growth*100).toFixed(1)}%</div>
                <div className="text-[11px] text-slate-500 font-medium">Taxa composta mensal</div>
              </div>

              {/* Recontato */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 -z-10"/>
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mb-4"><AlertTriangle size={14}/> Taxa de Recontato</div>
                <div className="text-5xl font-black text-slate-900 mb-1">{s.globalFCR.toFixed(1)}%</div>
                <div className="text-[11px] text-slate-500 font-medium">Janela de 14 dias p/ cliente</div>
              </div>

              {/* Equipa Necessária — CORRIGIDO: uma única classe bg-, texto visível */}
              <div className="bg-slate-900 p-6 rounded-3xl shadow-sm text-white">
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mb-5">
                  <Layout size={14}/> Equipa Necessária
                </div>
                <div className="flex justify-between items-center">
                  {config.phoneEnabled && Number(config.phoneAHT)>0 && (
                    <>
                      <div className="text-center flex-1">
                        <div className="text-3xl font-black text-white">{s.hcDist.phone}</div>
                        <Headset size={12} className="mx-auto mt-2 text-slate-400"/>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400">Voz</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{s.pDist.phone}% vol</div>
                      </div>
                      <div className="w-px h-14 bg-slate-700"/>
                    </>
                  )}
                  {config.chatEnabled && Number(config.chatAHT)>0 && (
                    <>
                      <div className="text-center flex-1">
                        <div className="text-3xl font-black text-white">{s.hcDist.chat}</div>
                        <MousePointer2 size={12} className="mx-auto mt-2 text-slate-400"/>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400">Chat</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{s.pDist.chat}% vol</div>
                      </div>
                      <div className="w-px h-14 bg-slate-700"/>
                    </>
                  )}
                  {config.emailEnabled && Number(config.emailAHT)>0 && (
                    <div className="text-center flex-1">
                      <div className="text-3xl font-black text-white">{s.hcDist.email}</div>
                      <Mail size={12} className="mx-auto mt-2 text-slate-400"/>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400">E-mail</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{s.pDist.email}% vol</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Evolução do Volume por Canal ─────────────────── */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96 flex flex-col">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  Evolução do Volume <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Mês a Mês</span>
                </h3>
                <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:CHANNEL_COLORS.telefone}}/>Telefone</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:CHANNEL_COLORS.chat}}/>Chat</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:CHANNEL_COLORS.email}}/>E-mail</span>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.monthlyTrend} margin={{top:10,right:10,left:-20,bottom:0}}>
                    <defs>
                      <linearGradient id="gTel"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={CHANNEL_COLORS.telefone} stopOpacity={0.9}/><stop offset="95%" stopColor={CHANNEL_COLORS.telefone} stopOpacity={0.6}/></linearGradient>
                      <linearGradient id="gChat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={CHANNEL_COLORS.chat}     stopOpacity={0.9}/><stop offset="95%" stopColor={CHANNEL_COLORS.chat}     stopOpacity={0.6}/></linearGradient>
                      <linearGradient id="gMail" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={CHANNEL_COLORS.email}    stopOpacity={0.9}/><stop offset="95%" stopColor={CHANNEL_COLORS.email}    stopOpacity={0.6}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:12,fill:'#64748b'}}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize:12,fill:'#64748b'}}/>
                    <RechartsTooltip content={(props:any)=><CustomTooltip {...props}/>} cursor={{stroke:'#cbd5e1',strokeWidth:1,strokeDasharray:'4 4'}}/>
                    <Area stackId="1" type="monotone" dataKey="telefone" name="Telefone" stroke={CHANNEL_COLORS.telefone} strokeWidth={2} fillOpacity={1} fill="url(#gTel)"/>
                    <Area stackId="1" type="monotone" dataKey="chat"     name="Chat"     stroke={CHANNEL_COLORS.chat}     strokeWidth={2} fillOpacity={1} fill="url(#gChat)"/>
                    <Area stackId="1" type="monotone" dataKey="email"    name="E-mail"   stroke={CHANNEL_COLORS.email}    strokeWidth={2} fillOpacity={1} fill="url(#gMail)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Analistas por Hora (NOVO) ─────────────────────── */}
            {s.hourlyStaffing.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col" style={{height:440}}>
                <div className="mb-4">
                  <h3 className="text-lg font-black text-slate-800">Analistas Necessários por Hora</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Demanda horária por canal — baseada no padrão do último mês.
                    Jornada configurada: <strong>{config.shiftHours}h</strong>.
                    Use este gráfico para planear entradas escalonadas e cobrir o pico sem sobrecarga.
                  </p>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={s.hourlyStaffing} margin={{top:10,right:10,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#64748b'}}/>
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#64748b'}} allowDecimals={false}/>
                      <RechartsTooltip content={(props:any) => {
                        const {active,payload,label} = props;
                        if (!active||!payload?.length) return null;
                        const total = payload.reduce((sum:number,p:any)=>sum+(p.value||0),0);
                        return (
                          <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                            <p className="font-bold text-slate-800 mb-2">{label} — {total} analistas</p>
                            {payload.map((p:any,i:number) => p.value>0 && (
                              <p key={i} className="text-sm font-semibold" style={{color:p.fill}}>{p.name}: {p.value}</p>
                            ))}
                          </div>
                        );
                      }}/>
                      <Legend wrapperStyle={{fontSize:12,fontWeight:700}}/>
                      {config.phoneEnabled && Number(config.phoneAHT)>0 && (
                        <Bar dataKey="telefone" name="Telefone" stackId="a" fill={CHANNEL_COLORS.telefone}/>
                      )}
                      {config.chatEnabled && Number(config.chatAHT)>0 && (
                        <Bar dataKey="chat" name="Chat" stackId="a" fill={CHANNEL_COLORS.chat}/>
                      )}
                      {config.emailEnabled && Number(config.emailAHT)>0 && (
                        <Bar dataKey="email" name="E-mail" stackId="a" fill={CHANNEL_COLORS.email} radius={[4,4,0,0]}/>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  💡 Com turnos de {config.shiftHours}h, planeie as entradas para que o pico esteja sempre coberto. Analistas que entram antes do pico cobrem a rampa de crescimento; os que entram no pico garantem cobertura máxima.
                </p>
              </div>
            )}

            {/* ── Taxa de Recontato ─────────────────────────────── */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96 flex flex-col">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                Taxa de Recontato (FCR) <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">% Mensal</span>
              </h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={s.fcrTrend} margin={{top:10,right:10,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:12,fill:'#64748b'}}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize:12,fill:'#64748b'}} tickFormatter={(v:any)=>`${v}%`}/>
                    <RechartsTooltip content={(props:any)=><CustomTooltip {...props}/>} cursor={{stroke:'#cbd5e1',strokeWidth:1,strokeDasharray:'4 4'}}/>
                    <Line type="monotone" dataKey="rate" name="Recontato (%)" stroke="#334155" strokeWidth={3} dot={{r:4,fill:'#334155',strokeWidth:2,stroke:'#fff'}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Distribuição de Demanda ───────────────────────── */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[500px] flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">Distribuição de Demanda</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedSubject ? `Motivos de: ${selectedSubject}` : 'Visão Macro: Assuntos. Clique na fatia para aprofundar.'}
                  </p>
                </div>
                {selectedSubject && (
                  <button onClick={()=>setSelectedSubject(null)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                    <ArrowLeft size={14}/> Voltar Macro
                  </button>
                )}
              </div>
              <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={currentPieData} innerRadius={100} outerRadius={160} paddingAngle={2} dataKey="value"
                      onClick={handlePieClick as any}
                      className={!selectedSubject?"cursor-pointer":""} label={renderPieLabel} labelLine>
                      {currentPieData.map((_:any,i:number) => (
                        <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} className="hover:opacity-80 transition-opacity"/>
                      ))}
                    </Pie>
                    <RechartsTooltip content={(props:any)=><CustomTooltip {...props}/>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Mapa de Calor ─────────────────────────────────── */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[450px] flex flex-col overflow-hidden">
              <h3 className="text-lg font-black text-slate-800 mb-1">Mapa de Calor (Concentração de Volume)</h3>
              <p className="text-xs text-slate-500 mb-6">Dias da Semana vs. Horas do Dia. Identifique picos térmicos para elaboração de escalas.</p>
              <div className="flex-1 overflow-auto pr-2 pb-2 custom-scrollbar">
                <div className="flex ml-12 mb-2">
                  {Array.from({length:24}).map((_:any,h:number) => (
                    <div key={h} className="flex-1 text-center text-[9px] font-bold text-slate-400 min-w-[24px]">{h}h</div>
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  {WEEKDAYS.map((day:string,dIdx:number) => (
                    <div key={day} className="flex items-center h-8">
                      <div className="w-12 text-[10px] font-black text-slate-600 uppercase text-right pr-3">{day}</div>
                      <div className="flex flex-1 gap-1 h-full">
                        {s.heatmapGrid[dIdx].map((val:number,hIdx:number) => (
                          <div key={hIdx} className="flex-1 rounded-sm relative group cursor-crosshair transition-all hover:ring-2 hover:ring-slate-900 hover:z-10"
                            style={{backgroundColor:getHeatmapColor(val,s.maxHeatmapVal)}}>
                            <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded whitespace-nowrap pointer-events-none z-50">
                              {day}, {hIdx}h: {val} contactos
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-end gap-2 text-[10px] font-bold text-slate-400">
                  Zero <div className="w-4 h-4 rounded-sm bg-[#f1f5f9]"/> <span className="mx-2">|</span> Frio
                  <div className="w-32 h-3 rounded-full" style={{background:'linear-gradient(to right,#3b82f6,#22c55e,#eab308,#ef4444)'}}/> Quente
                </div>
              </div>
            </div>

            {/* ── Notas sobre o Cálculo de Escala ──────────────── */}
            {(() => {
              const opDays = config.operationDays.length;
              const shift  = Number(config.shiftHours);
              const weeklyH = shift === 8 ? 40 : shift === 6 ? 30 : 20;
              const covPct  = ((s.coverageFactor - 1) * 100).toFixed(0);
              const needsCoverage = s.coverageFactor > 1;
              return (
                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 text-slate-700 text-sm space-y-3">
                  <h4 className="font-black text-indigo-700 uppercase tracking-widest text-xs flex items-center gap-2">
                    📋 Notas sobre o Cálculo de Escala por Hora
                  </h4>
                  <ul className="space-y-2 text-[13px] leading-relaxed">
                    <li>
                      <strong>Escala 5×2:</strong> O headcount ideal considera que cada analista trabalha
                      <strong> {shift}h/dia, {weeklyH}h semanais</strong>, descansando 2 dias por semana
                      (escala 5×2). Nenhum analista trabalha 7 dias corridos — a CLT brasileira limita
                      a jornada máxima a 44h semanais, e a cada 3 domingos trabalhados o analista tem
                      direito ao 4º domingo de folga.
                    </li>
                    {needsCoverage ? (
                      <li>
                        <strong>Fator de cobertura de folgas ({s.coverageFactor.toFixed(2)}×):</strong> Sua
                        operação funciona <strong>{opDays} dias/semana</strong>, mas cada analista só
                        trabalha <strong>5 dias</strong>. Nos dias em que uns estão de folga, outros precisam
                        cobrir — por isso o headcount foi acrescido em <strong>{covPct}%</strong> em relação
                        ao volume puro. O resultado ({s.hcIdeal} analistas) já inclui esse acréscimo.
                        O headcount base (sem o fator de cobertura) seria de <strong>{s.hcBase} analistas</strong>.
                      </li>
                    ) : (
                      <li>
                        <strong>Fator de cobertura:</strong> Sua operação funciona <strong>{opDays} dias/semana</strong>.
                        Como isso é igual ou inferior a 5 dias, todos os analistas conseguem cobrir todos
                        os dias de operação dentro da sua própria jornada semanal — nenhum acréscimo de
                        headcount foi necessário por conta de folgas.
                      </li>
                    )}
                    <li>
                      <strong>Gráfico de analistas por hora:</strong> O gráfico acima mostra a demanda
                      horária estimada por canal. Use-o para planejar entradas escalonadas: analistas
                      com jornadas de {shift}h que entram em horários diferentes cobrem o pico com
                      sobreposição controlada, sem superdimensionar o time em horários de baixo volume.
                    </li>
                    <li className="text-indigo-500 font-medium">
                      ⚠ Este cálculo é uma estimativa baseada nos dados históricos e nos parâmetros
                      informados. O gestor de CX deve validar estes números com a realidade operacional
                      do time, considerando absenteísmo, turnover, sazonalidades e particularidades de
                      cada contrato de trabalho.
                    </li>
                  </ul>
                </div>
              );
            })()}

            {/* ── Parecer Estratégico AI ────────────────────────── */}
            <div id="ai-report-section" className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl mt-4 relative overflow-hidden">
              <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none rotate-12 scale-150"><Sparkles size={400}/></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-10 border-b border-white/10 pb-6">
                  <div className="bg-indigo-500 p-4 rounded-2xl text-white shadow-lg shadow-indigo-500/30"><Sparkles size={28}/></div>
                  <div>
                    <h3 className="text-3xl font-black tracking-tight text-white">Parecer Estratégico WFM</h3>
                    <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mt-1">Sonata.cx • Powered by AI</p>
                  </div>
                </div>
                {isAiLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-indigo-300">
                    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mb-4"/>
                    <p className="text-sm font-bold tracking-widest uppercase animate-pulse">A analisar dados e a criar ponto de situação...</p>
                  </div>
                ) : aiReport ? (
                  <div className="prose prose-invert prose-indigo max-w-none text-slate-300">
                    {aiReport.split('\n').map((p:string,i:number) => {
                      if (p.startsWith('###')) return <h3 key={i} className="text-xl font-bold text-white mt-6 mb-2">{p.replace('###','')}</h3>;
                      if (p.startsWith('##'))  return <h2 key={i} className="text-2xl font-black text-white mt-8 mb-4 border-b border-white/10 pb-2">{p.replace('##','')}</h2>;
                      if (p.startsWith('#'))   return <h1 key={i} className="text-3xl font-black text-indigo-400 mt-6 mb-4">{p.replace('#','')}</h1>;
                      if (p.startsWith('-'))   return <li key={i} className="ml-4 mb-2">{p.replace('-','').trim()}</li>;
                      if (p.trim()==='')       return <br key={i}/>;
                      const html = p
                        .replace(/\*\*(.*?)\*\*/g,'<strong class="font-bold text-white">$1</strong>')
                        .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" class="text-indigo-400 underline">$1</a>');
                      return <p key={i} className="mb-4 leading-relaxed text-lg font-light" dangerouslySetInnerHTML={{__html:html}}/>;
                    })}
                    <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center">
                      {isAiError ? (
                        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full text-sm font-bold transition-colors flex items-center gap-2" onClick={generateReportAndAI}>
                          ↻ Tentar Novamente
                        </button>
                      ) : (
                        <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full text-sm font-bold transition-colors flex items-center gap-2" onClick={()=>window.print()}>
                          <Download size={16}/> Exportar Relatório (PDF)
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html:`
        .custom-scrollbar::-webkit-scrollbar{width:6px;height:6px;}
        .custom-scrollbar::-webkit-scrollbar-track{background:#f1f5f9;border-radius:10px;}
        .custom-scrollbar::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px;}
        .custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#94a3b8;}
        @media print{
          aside,button{display:none!important;}
          main{padding:0;width:100%;max-width:100%;background:white;}
          #ai-report-section{background:white!important;color:black!important;box-shadow:none!important;margin-top:2rem;}
          #ai-report-section *{color:black!important;border-color:#e2e8f0!important;}
        }
      `}}/>
    </div>
  );
}
