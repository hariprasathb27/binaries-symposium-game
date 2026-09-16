import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminSession } from '@/lib/auth';
import { getComponents, createComponent, updateComponent, deleteComponent, shuffleComponents, logAudit } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const components = getComponents();
  return NextResponse.json({ success: true, data: components });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Handle shuffle action on components
    if (action === 'shuffle') {
      const shuffled = shuffleComponents();
      logAudit('COMPONENTS_SHUFFLED', `Admin ${session.email} shuffled components`);
      return NextResponse.json({
        success: true,
        message: 'Components shuffled successfully',
        data: shuffled,
      });
    }

    const { name, image_url, description, category } = body;
    if (!name || !description) {
      return NextResponse.json(
        { success: false, message: 'Component name and description are required.' },
        { status: 400 }
      );
    }

    const component = createComponent({
      name: name.trim(),
      image_url: image_url?.trim() || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
      description: description.trim(),
      category: category?.trim() || 'General Component',
      active: true,
    });

    logAudit('COMPONENT_CREATED', `Component created: ${component.name} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Component added successfully',
      data: component,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to add component' },
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
      return NextResponse.json({ success: false, message: 'Component ID is required.' }, { status: 400 });
    }

    const updated = updateComponent(id, data);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Component not found.' }, { status: 404 });
    }

    logAudit('COMPONENT_UPDATED', `Component updated: ${id} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Component updated successfully',
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update component' },
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
      return NextResponse.json({ success: false, message: 'Component ID is required' }, { status: 400 });
    }

    const deleted = deleteComponent(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Component not found' }, { status: 404 });
    }

    logAudit('COMPONENT_DELETED', `Component deleted: ${id} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Component deleted successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete component' },
      { status: 500 }
    );
  }
}
