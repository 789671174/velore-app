import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function ensureBusiness(tenant: string){
  let biz = await prisma.business.findUnique({ where: { slug: tenant } });
  if(!biz) biz = await prisma.business.create({ data: { slug: tenant, name: tenant }});
  let s = await prisma.businessSettings.findFirst({ where: { businessId: biz.id } });
  if(!s) s = await prisma.businessSettings.create({
    data: {
      businessId: biz.id, slotMinutes: 30, bufferMinutes: 0,
      hoursJson: JSON.stringify({
        mon:{closed:false,ranges:[{from:"09:00",to:"18:00"}]},
        tue:{closed:false,ranges:[{from:"09:00",to:"18:00"}]},
        wed:{closed:false,ranges:[{from:"09:00",to:"18:00"}]},
        thu:{closed:false,ranges:[{from:"09:00",to:"18:00"}]},
        fri:{closed:false,ranges:[{from:"09:00",to:"18:00"}]},
        sat:{closed:true,ranges:[]}, sun:{closed:true,ranges:[]},
      }),
      holidaysJson: JSON.stringify({ items: [] }),
    }
  });
  return { biz, s };
}

export async function GET(req:NextRequest, { params }: { params: { tenant: string } }){
  const { s } = await ensureBusiness(params.tenant);
  return NextResponse.json(s);
}

export async function POST(req:NextRequest, { params }: { params: { tenant: string } }){
  const { biz, s } = await ensureBusiness(params.tenant);
  const body = await req.json();
  const slot = Math.max(5, Math.min(240, Number(body?.slotMinutes) || 30));
  const buf  = Math.max(0, Math.min(240, Number(body?.bufferMinutes) || 0));
  const updated = await prisma.businessSettings.update({
    where: { id: s.id },
    data: {
      slotMinutes: slot,
      bufferMinutes: buf,
      hoursJson: typeof body?.hoursJson==="string" ? body.hoursJson : JSON.stringify(body?.hoursJson ?? {}),
      holidaysJson: typeof body?.holidaysJson==="string" ? body.holidaysJson : JSON.stringify(body?.holidaysJson ?? {items:[]}),
    },
  });
  return NextResponse.json(updated);
}