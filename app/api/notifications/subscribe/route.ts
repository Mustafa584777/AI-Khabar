import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { interests, subscription, userEmail } = body;

    // Acknowledge subscription
    return NextResponse.json({
      success: true,
      message: 'Subscription registered successfully',
      interests: interests || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to register subscription' },
      { status: 500 }
    );
  }
}
