import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Lepotilnica by Karin <onboarding@resend.dev>";

interface BookingEmailItem {
    serviceName: string;
    servicePrice: number;
    serviceDuration: number;
    time: string;        // HH:mm (computed start time for this service)
    cancellationToken: string;
}

interface BookingEmailData {
    customerName: string;
    customerEmail: string;
    date: string;       // YYYY-MM-DD
    items: BookingEmailItem[];
}

function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function formatPrice(euros: number): string {
    return `€${euros.toFixed(2)}`;
}

function getCancelUrl(token: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return `${baseUrl}/cancel/${token}`;
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
                          <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;">Service</p>
                          <p style="margin:4px 0 0;font-size:16px;color:#1a1a1a;font-weight:600;">${item.serviceName}</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#555;">${item.time} · ${item.serviceDuration} min · ${formatPrice(item.servicePrice)}</p>
                        </td>
                      </tr>
                    </table>`).join('\n');

    const cancelLinksHtml = data.items.map(item => {
        const cancelUrl = getCancelUrl(item.cancellationToken);
        return `
                    <a href="${cancelUrl}" style="display:inline-block;margin:4px 4px;padding:10px 24px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:50px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
                      Cancel ${isSingle ? 'Appointment' : item.serviceName}
                    </a>`;
    }).join('\n');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmation</title>
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
                src="${process.env.NEXT_PUBLIC_BASE_URL || 'https://lepotilnica.si'}/logo.png"
                alt="Lepotilnica by Karin"
                width="180"
                style="height:auto;display:inline-block;max-width:180px;"
              />
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="margin:0;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:2px;">
                Booking Confirmed
              </p>
              <h2 style="margin:8px 0 0;font-size:24px;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-weight:400;">
                Hello, ${data.customerName}!
              </h2>
              <p style="margin:12px 0 0;font-size:15px;color:#555;line-height:1.6;">
                Your appointment${isSingle ? '' : 's'} ha${isSingle ? 's' : 've'} been confirmed. We look forward to seeing you!
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
                          <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;">Date</p>
                          <p style="margin:4px 0 0;font-size:16px;color:#1a1a1a;font-weight:600;">${formattedDate}</p>
                          <p style="margin:2px 0 0;font-size:14px;color:#555;">Starting at ${data.items[0].time} · ${totalDuration} minutes total</p>
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
                          <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.5px;">Total Price</p>
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
                      Need to cancel? You can cancel up to <strong style="color:#1a1a1a;">24 hours</strong> before your appointment.
                    </p>
                    ${cancelLinksHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

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
                Lepotilnica by Karin<br/>
                This is an automated confirmation email. Please do not reply.<br/>
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#ccc;">
                © ${new Date().getFullYear()} Lepotilnica by Karin. All rights reserved.
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

export async function sendBookingConfirmation(data: BookingEmailData): Promise<{ success: boolean; error?: string }> {
    try {
        const isSingle = data.items.length === 1;
        const subjectService = isSingle
            ? data.items[0].serviceName
            : `${data.items.length} services`;

        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [data.customerEmail],
            subject: `Booking Confirmed – ${subjectService} on ${formatDate(data.date)}`,
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
