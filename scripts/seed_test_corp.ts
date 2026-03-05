
import { createClient } from '@supabase/supabase-js';

// NOTA: Substitua pelas suas credenciais se necessário
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTestData() {
    console.log('Iniciando povoamento de dados...');

    // 1. Criar Empresa Test Corp
    const { data: company, error: companyError } = await supabase
        .from('companies')
        .upsert({ name: 'Test Corp', slug: 'test-corp' }, { onConflict: 'slug' })
        .select()
        .single();

    if (companyError) {
        console.error('Erro ao criar empresa:', companyError);
        return;
    }
    console.log('Empresa criada/verificada:', company.name);

    // 2. Criar Funcionários de Teste
    const employeesData = [
        { name: 'João Silva', external_id: '1001', role: 'colaborador', company_id: company.id },
        { name: 'Maria Santos', external_id: '1002', role: 'colaborador', company_id: company.id },
        { name: 'Carlos Oliveira', external_id: '1003', role: 'gestor', company_id: company.id },
    ];

    const { data: employees, error: empError } = await supabase
        .from('employees')
        .upsert(employeesData, { onConflict: 'external_id,company_id' })
        .select();

    if (empError) {
        console.error('Erro ao criar funcionários:', empError);
        return;
    }
    console.log(`${employees.length} funcionários criados/verificados.`);

    // 3. Criar Registros de Ponto (últimos 5 dias úteis)
    const today = new Date();
    const records: any[] = [];

    for (let i = 1; i <= 5; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        employees.forEach(emp => {
            records.push({
                company_id: company.id,
                employee_id: emp.id,
                external_employee_id: emp.external_id,
                record_date: dateStr,
                entry_1: '08:00',
                exit_1: '12:00',
                entry_2: '13:00',
                exit_2: '18:00',
                status: 'imported'
            });
        });
    }

    const { error: recordsError } = await supabase
        .from('time_tracking_records')
        .insert(records);

    if (recordsError) {
        console.error('Erro ao criar registros de ponto:', recordsError);
    } else {
        console.log(`${records.length} registros de ponto inseridos.`);
    }

    console.log('Povoamento concluído com sucesso!');
}

seedTestData();
