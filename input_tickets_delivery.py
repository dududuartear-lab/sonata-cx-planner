import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import unicodedata

def remover_acentos(texto):
    """Remove acentos e caracteres especiais de uma string."""
    if not isinstance(texto, str):
        return texto
    # Normaliza para decompor caracteres acentuados (ex: 'á' vira 'a' + '´')
    nfkd_form = unicodedata.normalize('NFKD', texto)
    # Filtra apenas caracteres que não são marcas de acentuação e converte Ç para C
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)]).replace('ç', 'c').replace('Ç', 'C').lower()

def gerar_base_tickets(num_linhas=100000):
    # Configurações de data para 2025
    data_inicial = datetime(2025, 1, 1)
    data_limite = datetime(2025, 6, 30, 23, 59, 59)
    canais = ['telefone', 'email', 'chat']
    
    # Mapeamento de Assunto e Motivo (Já sem acentos para garantir consistência)
    mapeamento_motivos = {
        'onboarding': ['como funciona', 'duvidas gerais', 'como usar cupons'],
        'logistica': ['tempo de entrega', 'rastreio de pedido', 'atraso', 'cancelamento'],
        'pagamento': ['cupom nao funciona', 'pagamento duplicado', 'estorno', 'contestacao'],
        'outros': ['elogios', 'feedbacks', 'outras duvidas']
    }
    
    assuntos = list(mapeamento_motivos.keys())
    dados = []
    
    # Pool de IDs de clientes (Reduzi para 25k para forçar mais recontatos naturais em 100k linhas)
    client_ids_gerais = [f"CLI-{i:05d}" for i in range(1, 25001)]
    
    # Crescimento mensal (dobrar do mês 1 ao 6)
    pesos_mensais = np.linspace(1.0, 2.0, 6)
    tickets_por_mes = (num_linhas * pesos_mensais / pesos_mensais.sum()).astype(int)

    current_row = 0
    
    # Dicionário para rastrear clientes ativos recentes e forçar recontatos
    clientes_recentes = []

    for mes in range(6):
        data_mes_inicio = data_inicial + timedelta(days=mes*30)
        num_tickets_mes = tickets_por_mes[mes]
        
        for _ in range(num_tickets_mes):
            # 1. Definir o dia e sazonalidade semanal
            dia_offset = random.randint(0, 29)
            data_ticket = data_mes_inicio + timedelta(days=dia_offset)
            if data_ticket > data_limite: data_ticket = data_limite

            dia_semana = data_ticket.weekday() 
            
            # Ajuste de volume semanal (Quarta cresce, Sex/Sab pico)
            skip_prob = 0
            if dia_semana in [0, 1]: skip_prob = 0.4 
            elif dia_semana == 2: skip_prob = 0.2    
            if random.random() < skip_prob and current_row > 1000: pass

            # 2. Sazonalidade Horária (95% Noite / Domingo Almoço)
            if dia_semana == 6: # Domingo: Pico 11h-16h
                hora = random.randint(11, 16) if random.random() < 0.7 else random.choice(list(range(0, 11)) + list(range(17, 24)))
            else: # Outros dias: 17h às 01h
                hora = random.choice([17, 18, 19, 20, 21, 22, 23, 0]) if random.random() < 0.95 else random.randint(1, 16)
            
            minuto, segundo = random.randint(0, 59), random.randint(0, 59)
            try:
                data_hora_final = data_ticket.replace(hour=hora, minute=minuto, second=segundo)
            except ValueError:
                data_hora_final = data_ticket

            # 3. Lógica de Seleção de Cliente (Forçar Recontatos e Recorrência)
            # 20% de chance de pegar um cliente que já falou recentemente (recontato)
            # 10% de chance de pegar um cliente de meses atrás (recorrência)
            prob = random.random()
            if prob < 0.20 and len(clientes_recentes) > 100:
                client_id = random.choice(clientes_recentes[-500:]) # Pega alguém que falou nos últimos tickets
            elif prob < 0.30 and len(dados) > 1000:
                client_id = random.choice(dados[:1000])['client_id'] # Pega alguém do início da base (meses diferentes)
            else:
                client_id = random.choice(client_ids_gerais)
            
            clientes_recentes.append(client_id)

            # 4. Assunto e Motivo
            assunto = random.choices(assuntos, weights=[20, 40, 30, 10])[0]
            motivo = random.choice(mapeamento_motivos[assunto])
            canal = random.choices(canais, weights=[30, 20, 50])[0]
            
            dados.append({
                'id_ticket': f"TKT-{current_row:06d}",
                'data_hora_entrada': data_hora_final,
                'client_id': client_id,
                'canal': canal,
                'assunto': assunto,
                'motivo': motivo
            })
            current_row += 1

    df = pd.DataFrame(dados)
    
    # Ordenar por data para garantir ordem cronológica
    df = df.sort_values('data_hora_entrada')
    
    # Aplicar limpeza de texto em todas as colunas relevantes
    colunas_texto = ['canal', 'assunto', 'motivo']
    for col in colunas_texto:
        df[col] = df[col].apply(remover_acentos)
    
    return df

# Execução
print("Gerando planilha higienizada para sonata.cx (Jan-Jun/2025)...")
df_final = gerar_base_tickets(100000)

# Exportar para CSV com o nome correto
df_final.to_csv('input_tickets_delivery.csv', index=False, encoding='utf-8')

print(f"Sucesso! Arquivo 'input_tickets_delivery.csv' gerado com {len(df_final)} linhas.")
print("\nExemplo dos dados (colunas tratadas):")
print(df_final[['canal', 'assunto', 'motivo']].head())