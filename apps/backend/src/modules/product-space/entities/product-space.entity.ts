import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 商品空间（Product Space）：
 * 一个商家通常会同时推广多个商品，每个商品需要独立的素材库 / 剧本 / 视频任务。
 * 在 VidForge 中，所有 material/script/creation_task 都归属于一个 productSpace。
 */
@Entity('product_spaces')
export class ProductSpace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  productName: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  coverUrl: string;

  /**
   * 商品知识库 — VidForge 的差异化壁垒
   *
   * 字段说明:
   *   sellingPoints   - 商品核心卖点(短句数组,会写进每次生成的 prompt)
   *   targetAudience  - 目标人群画像
   *   brandVoice      - 品牌 TOV(语气/风格调性,例如"专业不刻板,亲切不浮夸")
   *   priceRange      - 价格定位(影响奢华/亲民倾向)
   *   forbiddenWords  - 该品牌的自定义违禁词(扩展合规审核词典)
   *   bestPractices   - 历史"高分剧本"提炼的爆款公式(由系统自动写入)
   *
   * 这些字段在 ScriptService 生成时会自动注入,使得"商家用得越久,系统越懂他的品牌"。
   */
  @Column({ type: 'json', nullable: true })
  knowledge: {
    sellingPoints?: string[];
    targetAudience?: string;
    brandVoice?: string;
    priceRange?: '亲民' | '中端' | '高端';
    forbiddenWords?: string[];
    bestPractices?: Array<{
      scriptId: string;
      hookType: string;
      qualityScore: number;
      summary: string;
      learnedAt: string;
    }>;
  };

  /** 是否为默认空间(用户首次注册自动创建) */
  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
