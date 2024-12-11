import {
  Collection,
  Entity,
  Filter,
  ManyToOne,
  MikroORM,
  OneToMany,
  PrimaryKey,
  Property,
  Ref,
} from "@mikro-orm/sqlite";

@Entity()
class Author {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @OneToMany(() => Book, (book) => book.author)
  books = new Collection<Book>(this);

  @OneToMany(() => Fan, (fan) => fan.favoriteAuthor)
  fans = new Collection<Fan>(this);

  constructor(name: string) {
    this.name = name;
  }
}

@Entity()
class Fan {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string;

  @ManyToOne(() => Author)
  favoriteAuthor!: Ref<Author>;

  constructor(name: string) {
    this.name = name;
  }
}

@Entity()
@Filter({
  name: "soft-delete",
  cond: { deletedAt: null },
  default: true,
})
class Book {
  @PrimaryKey()
  id!: number;

  @Property()
  title: string;

  @ManyToOne(() => Author)
  author!: Ref<Author>;

  @Property({ nullable: true })
  deletedAt: Date | null = null;

  constructor(title: string) {
    this.title = title;
  }
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ":memory:",
    entities: [Author, Book],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test("findAndCount", async () => {
  const author = orm.em.create(Author, { name: "Stephen King" });
  orm.em.create(Fan, { favoriteAuthor: author, name: "David" });
  orm.em.create(Fan, { favoriteAuthor: author, name: "Jeremy" });
  orm.em.create(Book, { author, title: "Book 1", deletedAt: null });
  orm.em.create(Book, { author, title: "Book 2", deletedAt: null });
  await orm.em.flush();
  orm.em.clear();

  const [fans, count] = await orm.em.findAndCount(
    Fan,
    {},
    { populate: ["favoriteAuthor.books"] }
  );
  expect(fans).toHaveLength(2);
  expect(count).toBe(2);
});
