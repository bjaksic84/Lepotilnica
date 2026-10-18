import { Resend } from "resend";
import { SITE_URL, BUSINESS, BUSINESS_ADDRESS_LINE, SITE_NAME } from "@/lib/site";

// Lazily construct the Resend client so importing this module is side-effect
// free. `new Resend()` throws when RESEND_API_KEY is missing, which would break
// the build's page-data collection; deferring it to send time avoids that.
let _resend: Resend | null = null;

function getResend(): Resend {
    if (!_resend) {
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
}

const FROM_EMAIL = `${SITE_NAME} <noreply@send.lepotilnicabykarin.si>`;

// Replies to the automated `noreply@send.` address go nowhere, so every send
// routes answers to the public inbox, which Cloudflare Email Routing forwards
// on to Karin.
const REPLY_TO = BUSINESS.email;

interface BookingEmailItem {
    serviceName: string;
    servicePrice: number;
    serviceDuration: number;
    time: string;        // HH:mm (computed start time for this service)
    cancellationToken: string;
}

/**
 * No `customerName`: the greeting is deliberately name-free (see the template),
 * nothing else in the message addresses the customer by name, and carrying an
 * unused field here invites someone to assume it is being shown.
 */
interface BookingEmailData {
    customerEmail: string;
    date: string;       // YYYY-MM-DD
    items: BookingEmailItem[];
}

function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("sl-SI", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

/**
 * Slovenian has four plural forms keyed on n mod 100: 1 → ena storitev,
 * 2 → dve storitvi, 3–4 → tri storitve, everything else → pet storitev.
 */
function pluralServices(count: number): string {
    const mod100 = count % 100;
    if (mod100 === 1) return `${count} storitev`;
    if (mod100 === 2) return `${count} storitvi`;
    if (mod100 === 3 || mod100 === 4) return `${count} storitve`;
    return `${count} storitev`;
}

function formatPrice(euros: number): string {
    return `€${euros.toFixed(2)}`;
}

function getCancelUrl(token: string): string {
    return `${SITE_URL}/cancel/${token}`;
}

/**
 * Shared chrome for every transactional e-mail: the branded header, the card
 * the content sits in, and the NAP footer. Extracted so a change of address or
 * phone number lands in every template at once rather than in whichever one
 * someone remembers to edit.
 */
function emailShell(title: string, contentHtml: string): string {
    return `
<!DOCTYPE html>
<html lang="sl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#faf5f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf5f0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);padding:32px 40px;text-align:center;">
              <img
                src="${SITE_URL}/logo.png"
                alt="Lepotilnica by Karin"
                width="180"
                style="height:auto;display:inline-block;max-width:180px;"
              />
            </td>
          </tr>
${contentHtml}
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #f0e6d8;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 40px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.8;">
                <strong style="color:#888;">${SITE_NAME}</strong><br/>
                ${BUSINESS_ADDRESS_LINE}<br/>
                <a href="tel:${BUSINESS.phone}" style="color:#aaa;text-decoration:none;">${BUSINESS.phoneDisplay}</a>
                &nbsp;·&nbsp;
                <a href="mailto:${BUSINESS.email}" style="color:#aaa;text-decoration:none;">${BUSINESS.email}</a>
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#aaa;line-height:1.6;">
                To sporočilo je poslano samodejno. Če imate vprašanje, lahko nanj preprosto odgovorite.
              </p>
              <p style="margin:10px 0 0;font-size:11px;color:#c4c4c4;">
                <a href="${SITE_URL}/pogoji" style="color:#c4c4c4;">Splošni pogoji poslovanja</a>
                &nbsp;·&nbsp;
                <a href="${SITE_URL}/zasebnost" style="color:#c4c4c4;">Politika zasebnosti</a>
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#ccc;">
                © ${new Date().getFullYear()} ${SITE_NAME}. Vse pravice pridržane.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildConfirmationHtml(data: BookingEmailData): string {
    const formattedDate = formatDate(data.date);
    const totalPrice = data.items.reduce((sum, i) => sum + i.servicePrice, 0);
    const totalDuration = data.items.reduce((sum, i) => sum + i.serviceDuration, 0);
    const isSingle = data.items.length === 1;

    const serviceRowsHtml = data.items.map(item => `
                    <!-- Service: ${item.serviceName} -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td width="40" valign="top" style="padding-right:14px;">
                          <div style="width:36px;height:36px;background:#1a1a1a;border-radius:50%;text-align:center;line-height:36px;font-size:16px;">
                            ✨
                          </div>
                        </td>
                        <td valign="top">
                          <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;">Storitev</p>
                          <p style="margin:4px 0 0;font-size:16px;color:#1a1a1a;font-weight:600;">${item.serviceName}</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#555;">${item.time} · ${item.serviceDuration} min · ${formatPrice(item.servicePrice)}</p>
                        </td>
                      </tr>
                    </table>`).join('\n');

    const cancelLinksHtml = data.items.map(item => {
        const cancelUrl = getCancelUrl(item.cancellationToken);
        return `
                    <a href="${cancelUrl}" style="display:inline-block;margin:4px 4px;padding:10px 24px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:50px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
                      ${isSingle ? 'Odpovej termin' : `Odpovej: ${item.serviceName}`}
                    </a>`;
    }).join('\n');

    return emailShell("Potrditev rezervacije", `
          <!-- Greeting -->
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="margin:0;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:2px;">
                Rezervacija potrjena
              </p>
              <!-- Greeting is deliberately name-free: the address is already
                   the customer's, and a mis-cased or mistyped name in a
                   headline reads worse than no name at all. -->
              <h2 style="margin:8px 0 0;font-size:24px;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-weight:400;">
                Pozdravljeni!
              </h2>
              <p style="margin:12px 0 0;font-size:15px;color:#555;line-height:1.6;">
                ${isSingle ? 'Vaš termin je potrjen.' : 'Vaši termini so potrjeni.'} Veselimo se vašega obiska!
              </p>
            </td>
          </tr>

          <!-- Appointment Details Card -->
          <tr>
            <td style="padding:28px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5f0;border-radius:12px;border:1px solid #f0e6d8;">
                <tr>
                  <td style="padding:28px;">
                    ${serviceRowsHtml}
                    
                    <!-- Date & Time -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                      <tr>
                        <td width="40" valign="top" style="padding-right:14px;">
                          <div style="width:36px;height:36px;background:#1a1a1a;border-radius:50%;text-align:center;line-height:36px;font-size:16px;">
                            📅
                          </div>
                        </td>
                        <td valign="top">
                          <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;">Datum</p>
                          <p style="margin:4px 0 0;font-size:16px;color:#1a1a1a;font-weight:600;">${formattedDate}</p>
                          <p style="margin:2px 0 0;font-size:14px;color:#555;">Začetek ob ${data.items[0].time} · skupaj ${totalDuration} minut</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Price -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top" style="padding-right:14px;">
                          <div style="width:36px;height:36px;background:#1a1a1a;border-radius:50%;text-align:center;line-height:36px;font-size:16px;">
                            💰
                          </div>
                        </td>
                        <td valign="top">
                          <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;">Za plačilo v salonu</p>
                          <p style="margin:4px 0 0;font-size:20px;color:#1a1a1a;font-weight:700;">${formatPrice(totalPrice)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cancellation Section -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0;border-radius:12px;border:1px solid #f5e6d0;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:13px;color:#888;line-height:1.5;">
                      Ne morete priti? Termin lahko brezplačno odpoveste najpozneje <strong style="color:#1a1a1a;">36 ur</strong> pred začetkom.
                      Pri poznejši odpovedi veljajo <a href="${SITE_URL}/pogoji" style="color:#888;">splošni pogoji poslovanja</a>.
                    </p>
                    ${cancelLinksHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
`);
}

export async function sendBookingConfirmation(data: BookingEmailData): Promise<{ success: boolean; error?: string }> {
    try {
        const isSingle = data.items.length === 1;
        const subjectService = isSingle
            ? data.items[0].serviceName
            : pluralServices(data.items.length);

        const { error } = await getResend().emails.send({
            from: FROM_EMAIL,
            replyTo: REPLY_TO,
            to: [data.customerEmail],
            subject: `Rezervacija potrjena – ${subjectService}, ${formatDate(data.date)}`,
            html: buildConfirmationHtml(data),
        });

        if (error) {
            console.error("[Email] Failed to send confirmation:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error("[Email] Unexpected error:", err);
        return { success: false, error: "Failed to send email" };
    }
}

/* ── Reschedule notice ───────────────────────────────── */

export interface RescheduleEmailData {
    customerEmail: string;
    serviceName: string;
    serviceDuration: number;
    /** Where the appointment used to be. */
    previousDate: string;   // YYYY-MM-DD
    previousTime: string;   // HH:mm
    /** Where it is now. */
    date: string;           // YYYY-MM-DD
    time: string;           // HH:mm
    cancellationToken: string | null;
}

function buildRescheduleHtml(data: RescheduleEmailData): string {
    const cancelHtml = data.cancellationToken
        ? `
          <!-- Cancellation Section -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0;border-radius:12px;border:1px solid #f5e6d0;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="margin:0 0 10px;font-size:13px;color:#888;line-height:1.5;">
                      Vam novi termin ne ustreza? Odpoved je brezplačna najpozneje <strong style="color:#1a1a1a;">36 ur</strong> pred začetkom,
                      sicer veljajo <a href="${SITE_URL}/pogoji" style="color:#888;">splošni pogoji poslovanja</a>.
                    </p>
                    <a href="${getCancelUrl(data.cancellationToken)}" style="display:inline-block;margin:4px;padding:10px 24px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:50px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
                      Odpovej termin
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
`
        : "";

    return emailShell("Sprememba termina", `
          <!-- Greeting -->
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="margin:0;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:2px;">
                Sprememba termina
              </p>
              <h2 style="margin:8px 0 0;font-size:24px;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-weight:400;">
                Pozdravljeni!
              </h2>
              <p style="margin:12px 0 0;font-size:15px;color:#555;line-height:1.6;">
                Vaš termin za <strong style="color:#1a1a1a;">${data.serviceName}</strong> smo prestavili.
                Če vam novi termin ne ustreza, nam to prosimo sporočite.
              </p>
            </td>
          </tr>

          <!-- Old → new -->
          <tr>
            <td style="padding:28px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5f0;border-radius:12px;border:1px solid #f0e6d8;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;">Prejšnji termin</p>
                    <p style="margin:4px 0 0;font-size:15px;color:#999;text-decoration:line-through;">
                      ${formatDate(data.previousDate)} ob ${data.previousTime}
                    </p>
                    <div style="height:1px;background:#f0e6d8;margin:18px 0;"></div>
                    <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;">Novi termin</p>
                    <p style="margin:4px 0 0;font-size:18px;color:#1a1a1a;font-weight:700;">
                      ${formatDate(data.date)}
                    </p>
                    <p style="margin:2px 0 0;font-size:15px;color:#555;">
                      Začetek ob ${data.time} · ${data.serviceDuration} min
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
${cancelHtml}`);
}

/* ── Website enquiry ─────────────────────────────────── */

export interface EnquiryEmailData {
    name: string;
    email: string;
    phone?: string;
    topic?: string;
    message: string;
}

/** Minimal escaping — every field here is visitor-supplied free text. */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function buildEnquiryHtml(data: EnquiryEmailData): string {
    const row = (label: string, value: string) => `
                    <tr>
                      <td style="padding:8px 0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;width:110px;" valign="top">${label}</td>
                      <td style="padding:8px 0;font-size:15px;color:#1a1a1a;" valign="top">${value}</td>
                    </tr>`;

    return emailShell("Novo povpraševanje", `
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="margin:0;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:2px;">
                Novo povpraševanje
              </p>
              <h2 style="margin:8px 0 0;font-size:24px;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-weight:400;">
                ${escapeHtml(data.name)}
              </h2>
              <p style="margin:12px 0 0;font-size:14px;color:#555;line-height:1.6;">
                Sporočilo je prispelo prek obrazca na spletni strani. Na to sporočilo lahko
                neposredno odgovorite — odgovor bo prejel pošiljatelj.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5f0;border-radius:12px;border:1px solid #f0e6d8;">
                <tr>
                  <td style="padding:22px 26px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${row("E-pošta", `<a href="mailto:${escapeHtml(data.email)}" style="color:#1a1a1a;">${escapeHtml(data.email)}</a>`)}
                      ${data.phone ? row("Telefon", `<a href="tel:${escapeHtml(data.phone)}" style="color:#1a1a1a;">${escapeHtml(data.phone)}</a>`) : ""}
                      ${data.topic ? row("Zanima jih", escapeHtml(data.topic)) : ""}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 8px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;">Sporočilo</p>
              <p style="margin:0;font-size:15px;color:#1a1a1a;line-height:1.7;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
            </td>
          </tr>
`);
}

/**
 * Enquiry notification, sent to the salon rather than to the visitor.
 *
 * `replyTo` is the visitor's address so Karin can answer straight from her
 * inbox. The `from` stays on the verified sending domain — putting the
 * visitor's address there would fail SPF/DKIM alignment and land the mail in
 * spam, which is the usual way contact forms quietly stop working.
 */
export async function sendEnquiry(
    data: EnquiryEmailData
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await getResend().emails.send({
            from: FROM_EMAIL,
            replyTo: data.email,
            to: [BUSINESS.email],
            subject: `Povpraševanje s spletne strani — ${data.name}${data.topic ? ` (${data.topic})` : ""}`,
            html: buildEnquiryHtml(data),
        });

        if (error) {
            console.error("[Email] Failed to send enquiry:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error("[Email] Unexpected error:", err);
        return { success: false, error: "Failed to send email" };
    }
}

/**
 * Sent when the admin moves an appointment in the dashboard calendar and
 * chooses to notify the customer. Opt-in rather than automatic: plenty of
 * moves are agreed on the phone first, and a second e-mail then just confuses.
 */
export async function sendBookingReschedule(
    data: RescheduleEmailData
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await getResend().emails.send({
            from: FROM_EMAIL,
            replyTo: REPLY_TO,
            to: [data.customerEmail],
            subject: `Sprememba termina – ${data.serviceName}, ${formatDate(data.date)} ob ${data.time}`,
            html: buildRescheduleHtml(data),
        });

        if (error) {
            console.error("[Email] Failed to send reschedule notice:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error("[Email] Unexpected error:", err);
        return { success: false, error: "Failed to send email" };
    }
}
