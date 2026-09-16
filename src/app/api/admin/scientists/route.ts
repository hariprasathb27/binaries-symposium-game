import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminSession } from '@/lib/auth';
import { getScientists, getScientistById, createScientist, updateScientist, deleteScientist, logAudit } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const scientists = getScientists();
  return NextResponse.json({ success: true, data: scientists });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, image_url, description, field, country, year } = body;

    if (!name || !description) {
      return NextResponse.json(
        { success: false, message: 'Scientist name and description are required.' },
        { status: 400 }
      );
    }

    const scientist = createScientist({
      name: name.trim(),
      image_url: image_url?.trim() || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
      description: description.trim(),
      field: field?.trim() || 'Science & Invention',
      country: country?.trim() || 'International',
      year: year?.trim() || 'Modern Era',
    });

    logAudit('SCIENTIST_CREATED', `Scientist created: ${scientist.name} (${scientist.id}) by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Scientist added successfully',
      data: scientist,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to add scientist' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Scientist ID is required.' }, { status: 400 });
    }

    const updated = updateScientist(id, data);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Scientist not found.' }, { status: 404 });
    }

    logAudit('SCIENTIST_UPDATED', `Scientist updated: ${id} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Scientist updated successfully',
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update scientist' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Scientist ID is required' }, { status: 400 });
    }

    const deleted = deleteScientist(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Scientist not found' }, { status: 404 });
    }

    logAudit('SCIENTIST_DELETED', `Scientist deleted: ${id} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Scientist deleted successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete scientist' },
      { status: 500 }
    );
  }
}
