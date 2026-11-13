import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberEntity } from '../../members/infrastructure/member.entity';
import { VISITORS_CTE } from './visitor-facts.sql';

export type SearchMode = 'auto' | 'name' | 'phone' | 'id';
export const SEARCH_MODES: SearchMode[] = ['auto', 'name', 'phone', 'id'];

const RESULT_LIMIT = 200;

export interface VisitorSearchRow {
  id: string;
  name: string;
  phone: string;
  gender: string | null;
  stayType: string | null;
  status: string;
  activityStatus: string;
  registeredOn: string;
  lastAttended: string | null;
}

export interface VisitorSearchResult {
  total: number;
  rows: VisitorSearchRow[];
}

/** Decide what a typed query most likely is when the mode is "auto". */
export function detectSearchMode(query: string): Exclude<SearchMode, 'auto'> {
  const trimmed = query.trim();
  if (/^[+\d][\d\s\-()+]{4,}$/.test(trimmed)) return 'phone';
  if (
    /^[0-9a-f]{8}(-[0-9a-f]{4}){0,4}[0-9a-f-]*$/i.test(trimmed) &&
    !/\s/.test(trimmed) &&
    /\d/.test(trimmed)
  ) {
    return 'id';
  }
  return 'name';
}

/** Escape LIKE wildcards so a typed "%" or "_" matches literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Local phone formats differ (0712..., +254712...), so match on the number without its prefix. */
export function phoneCore(query: string): string {
  return query.replace(/\D/g, '').replace(/^(254|0)/, '');
}

@Injectable()
export class VisitorSearchService {
  constructor(
    @InjectRepository(MemberEntity)
    private readonly memberOrm: Repository<MemberEntity>,
  ) {}

  async search(
    query: string | undefined,
    mode: SearchMode = 'auto',
    registeredOn?: string,
  ): Promise<VisitorSearchResult> {
    const params: unknown[] = [];
    const conditions: string[] = [];
    const bind = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    const text = query?.trim();
    if (text) {
      const effective = mode === 'auto' ? detectSearchMode(text) : mode;
      if (effective === 'phone') {
        const core = phoneCore(text);
        conditions.push(
          `regexp_replace(COALESCE(v.phone, ''), '\\D', '', 'g') LIKE ${bind(`%${escapeLike(core)}%`)}`,
        );
      } else if (effective === 'id') {
        conditions.push(`v.id::text ILIKE ${bind(`${escapeLike(text)}%`)}`);
      } else {
        conditions.push(
          `(v.first_name || ' ' || v.last_name) ILIKE ${bind(`%${escapeLike(text)}%`)}`,
        );
      }
    }
    if (registeredOn) {
      conditions.push(`v.joined_at = ${bind(registeredOn.slice(0, 10))}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const raw = await this.memberOrm.manager.query<
      Record<string, string | null>[]
    >(
      `WITH ${VISITORS_CTE}
       SELECT v.*, COUNT(*) OVER() AS total_count,
              to_char(v.joined_at, 'YYYY-MM-DD') AS registered,
              to_char(v.last_attended, 'YYYY-MM-DD') AS last_seen
       FROM visitors v ${where}
       ORDER BY v.joined_at DESC, v.last_name, v.first_name
       LIMIT ${RESULT_LIMIT}`,
      params,
    );

    return {
      total: raw.length ? Number(raw[0].total_count) : 0,
      rows: raw.map((r) => ({
        id: r.id as string,
        name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
        phone: r.phone ?? '',
        gender: r.gender,
        stayType: r.stay_type,
        status: r.lifecycle as string,
        activityStatus: r.activity_status as string,
        registeredOn: r.registered as string,
        lastAttended: r.last_seen,
      })),
    };
  }
}
