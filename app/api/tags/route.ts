import { ServerStorage } from '@/lib/server-storage';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tags = await ServerStorage.getAllTags();
    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.tag) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }
    const tags = await ServerStorage.addTag(body.tag);
    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag');
    if (!tag) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }
    const tags = await ServerStorage.deleteTag(tag);
    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
