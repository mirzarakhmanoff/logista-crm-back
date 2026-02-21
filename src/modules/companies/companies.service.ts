import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from './schemas/company.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<Company>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const existing = await this.companyModel.findOne({ slug: createCompanyDto.slug }).exec();
    if (existing) {
      throw new ConflictException(`"${createCompanyDto.slug}" slug allaqachon mavjud`);
    }

    const company = new this.companyModel(createCompanyDto);
    return company.save();
  }

  async findAll(): Promise<Company[]> {
    return this.companyModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyModel.findById(id).exec();
    if (!company) {
      throw new NotFoundException(`Company ID ${id} topilmadi`);
    }
    return company;
  }

  async findBySlug(slug: string): Promise<Company | null> {
    return this.companyModel.findOne({ slug }).exec();
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    if (updateCompanyDto.slug) {
      const existing = await this.companyModel
        .findOne({ slug: updateCompanyDto.slug, _id: { $ne: id } })
        .exec();
      if (existing) {
        throw new ConflictException(`"${updateCompanyDto.slug}" slug allaqachon mavjud`);
      }
    }

    const company = await this.companyModel
      .findByIdAndUpdate(id, updateCompanyDto, { new: true })
      .exec();

    if (!company) {
      throw new NotFoundException(`Company ID ${id} topilmadi`);
    }
    return company;
  }

  async toggleActive(id: string): Promise<Company> {
    const company = await this.findOne(id);
    company.isActive = !company.isActive;
    return company.save();
  }
}
