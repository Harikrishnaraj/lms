import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { AuthorizationService } from '../authorization/authorization.service';
import { ListSearchQueryDto } from './dto/list-search.dto';
import { SearchResultItem, SearchService } from './search.service';

@ApiTags('Search')
@Controller('organizations/me/search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Global database search for courses, paths, and users' })
  async search(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSearchQueryDto,
  ): Promise<SearchResultItem[]> {
    // Resolve authorization context to check if user:view permission is present
    const authContext = await this.authorizationService.resolve(organizationId, user.id);
    const hasUserView = authContext?.permissions.includes('user:view') ?? false;

    // Resolve types to search
    const activeTypes = query.type
      ? query.type.split(',').map((t) => t.trim().toLowerCase())
      : ['courses', 'paths', 'users'];

    return this.searchService.search(organizationId, query.q, activeTypes, hasUserView);
  }
}
