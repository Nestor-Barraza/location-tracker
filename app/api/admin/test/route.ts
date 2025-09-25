import { NextResponse } from 'next/server';

export async function DELETE() {
  console.log('DELETE test endpoint called');
  return NextResponse.json({ success: true, message: 'DELETE method works' });
}