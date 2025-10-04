import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

function defaultHours() {
  return {
    Mo:{open:true,start:"09:00",end:"18:00"},
    Di:{open:true,start:"09:00",end:"18:00"},
    Mi:{open:true,start:"09:00",end:"18:00"},
    Do:{open:true,start:"09:00",end:"18:00"},
    Fr:{open:true,start:"09:00",end:"18:00"},
    Sa:{open:false,start:"09:00",end:"13:00"},
    So:{open:false,start:"00:00",end:"00:00"},
  };
}

async function ensureSettings() {
  let s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s) {
    s = await prisma.settings.create({
      data: { id: 1, name: "Velora", hoursJson: JSON.stringify(defaultHours()) },
    });
  }
  return s;
}

export async function GET() {
  const s = await ensureSettings();
  return NextResponse.json(s);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const s = await ensureSettings();

  const hoursString =
    typeof body.hours === "string"
      ? body.hours
      : body.hours
      ? JSON.stringify(body.hours)
      : s.hoursJson;

  const updated = await prisma.settings.update({
    where: { id: s.id },
    data: {
      name: body.name ?? s.name,
      logoDataUrl: body.logoDataUrl ?? s.logoDataUrl,
      address: body.address ?? s.address,
      phone: body.phone ?? s.phone,
      email: body.email ?? s.email,
      website: body.website ?? s.website,
      slotMinutes:
        typeof body.slotMinutes === "number" ? body.slotMinutes : s.slotMinutes,
      bufferMinutes:
        typeof body.bufferMinutes === "number" ? body.bufferMinutes : s.bufferMinutes,
      hoursJson: hoursString,
    },
  });

  return NextResponse.json(updated);
}
