const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** "2026-11-09" -> "09/11/2026". */
export function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

/** Instante ISO -> "dd/mm/aaaa HH:mm" na hora local. */
export function dataHoraLocal(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()} `
    + `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

/** pt-BR com no máximo 1 casa e sem ",0": 82 -> "82", 82.5 -> "82,5". */
export function numeroBr(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
