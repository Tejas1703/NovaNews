import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUserByName } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Find or create user in MongoDB
    const user = await findOrCreateUserByName(trimmedName);

    return NextResponse.json({
      success: true,
      userId: user.id,
      userName: user.name,
      isNewUser: user.createdAt.getTime() > Date.now() - 1000, // Created in last second
    });
  } catch (error) {
    console.error('Error in user route:', error);
    return NextResponse.json(
      { error: 'Failed to create or find user' },
      { status: 500 }
    );
  }
}
