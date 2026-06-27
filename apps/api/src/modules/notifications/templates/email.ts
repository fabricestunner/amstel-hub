export function loyaltyEmailHtml(title: string, body: string): string {
  return `<html><body style="font-family:sans-serif;max-width:600px;margin:auto">
    <h2 style="color:#F59E0B">${title}</h2>
    <p>${body}</p>
    <p style="color:#6B7280;font-size:12px">Amstel Rewards Platform</p>
  </body></html>`;
}
