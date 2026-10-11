import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getManifest() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'src/config/contracts-manifest.json'),
    path.resolve(process.cwd(), 'public/contracts/manifest.json'),
    path.resolve(process.cwd(), '../contracts/verification/manifest.json'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const download = searchParams.get('download');
  const networkParam = searchParams.get('network') || 'mainnet';
  const format = searchParams.get('format') || 'json'; // 'json' or 'sol'

  const netKey = networkParam.includes('sepolia') ? 'sepolia' : 'mainnet';
  const manifest = getManifest();

  if (!manifest) {
    return NextResponse.json({ error: 'Contracts manifest not found' }, { status: 404 });
  }

  // Handle direct file download
  if (download) {
    const contracts = manifest.networks[netKey]?.contracts;
    const contractInfo = contracts?.[download];
    if (!contractInfo) {
      return NextResponse.json(
        { error: `Contract '${download}' not found for network '${netKey}'` },
        { status: 404 },
      );
    }

    const fileName = format === 'sol' ? `${download}.sol` : `${download}-standard-input.json`;
    const filePath = path.resolve(process.cwd(), `public/contracts/${netKey}/${fileName}`);

    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const contentType = format === 'sol' ? 'text/plain; charset=utf-8' : 'application/json';
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${download}-${netKey}-${fileName}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return NextResponse.json(
      { error: `Verification file not found: ${fileName}` },
      { status: 404 },
    );
  }

  // Handle network filter
  if (searchParams.has('network')) {
    return NextResponse.json({
      network: manifest.networks[netKey],
      compiler: manifest.compiler,
    });
  }

  // Default: Return full manifest with direct verification links
  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
