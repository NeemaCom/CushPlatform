import { Storage } from "./storage";

export class AvatarService {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  /**
   * Detects likely gender from first name using common name patterns
   */
  private detectGenderFromName(firstName: string): 'male' | 'female' | 'neutral' {
    const name = firstName.toLowerCase().trim();
    
    // Common female name patterns and endings
    const femalePatterns = [
      // Common female names
      'mary', 'sarah', 'jessica', 'amanda', 'jennifer', 'linda', 'patricia', 'maria',
      'susan', 'karen', 'nancy', 'betty', 'helen', 'sandra', 'donna', 'carol',
      'ruth', 'sharon', 'michelle', 'laura', 'sarah', 'kimberly', 'deborah',
      'dorothy', 'lisa', 'nancy', 'karen', 'betty', 'helen', 'sandra', 'donna',
      'elizabeth', 'jennifer', 'maria', 'susan', 'margaret', 'dorothy', 'lisa',
      'nancy', 'karen', 'betty', 'helen', 'sandra', 'donna', 'carol', 'ruth',
      'sharon', 'michelle', 'laura', 'sarah', 'kimberly', 'deborah', 'cynthia',
      'amy', 'angela', 'brenda', 'emma', 'olivia', 'sophia', 'isabella', 'mia',
      'charlotte', 'amelia', 'harper', 'evelyn', 'abigail', 'emily', 'ella',
      'scarlett', 'grace', 'chloe', 'victoria', 'riley', 'aria', 'lily',
      'aubrey', 'zoey', 'penelope', 'lillian', 'addison', 'layla', 'natalie',
      'camila', 'hannah', 'brooklyn', 'zoe', 'nora', 'leah', 'savannah',
      'audrey', 'claire', 'eleanor', 'skylar', 'ellie', 'samantha', 'stella',
      'paisley', 'violet', 'mila', 'allison', 'maya', 'lucy', 'elena',
      // African names
      'adunni', 'folake', 'kemi', 'yemi', 'funmi', 'bisi', 'temi', 'dupe',
      'ronke', 'bunmi', 'sade', 'nike', 'kehinde', 'taiwo', 'ayo', 'bola',
      'kike', 'lola', 'dami', 'tola', 'wumi', 'shade', 'peju', 'yinka',
      'bukky', 'toyin', 'funke', 'bisola', 'omolara', 'adebisi', 'oluwaseun',
      'adebayo', 'oluwakemi', 'oluwafunmi', 'oluwayemi', 'oluwabukola',
      'fatima', 'aisha', 'zainab', 'khadija', 'hauwa', 'maryam', 'safiya',
      'hadiza', 'amina', 'rukayya', 'halima', 'jamila', 'naima', 'zahra',
      // European names
      'anna', 'marie', 'claire', 'sophie', 'camille', 'julie', 'nathalie',
      'isabelle', 'catherine', 'sylvie', 'martine', 'françoise', 'monique',
      'brigitte', 'nicole', 'véronique', 'christine', 'dominique', 'pascale',
      'chantal', 'corinne', 'valérie', 'sandrine', 'stéphanie', 'céline',
      'virginie', 'audrey', 'laetitia', 'émilie', 'charlotte', 'manon',
      'léa', 'clara', 'inès', 'jade', 'lola', 'zoé', 'alice', 'lena',
      'mia', 'nina', 'eva', 'lou', 'rose', 'anna', 'louise', 'romane',
      'juliette', 'clémence', 'océane', 'margot', 'pauline', 'jeanne',
      'elena', 'sara', 'laura', 'paula', 'marta', 'ana', 'cristina',
      'pilar', 'carmen', 'dolores', 'rosa', 'antonia', 'francisca',
      'isabel', 'josefa', 'mercedes', 'concepción', 'milagros', 'esperanza',
      'amparo', 'remedios', 'lourdes', 'inmaculada', 'soledad', 'asunción'
    ];

    // Common male name patterns and endings
    const malePatterns = [
      // Common male names
      'james', 'john', 'robert', 'michael', 'william', 'david', 'richard',
      'charles', 'joseph', 'thomas', 'christopher', 'daniel', 'paul', 'mark',
      'donald', 'steven', 'andrew', 'kenneth', 'paul', 'joshua', 'kevin',
      'brian', 'george', 'timothy', 'ronald', 'jason', 'edward', 'jeffrey',
      'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen',
      'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'frank',
      'matthew', 'gregory', 'raymond', 'alexander', 'patrick', 'jack',
      'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'henry', 'adam',
      'douglas', 'nathan', 'peter', 'zachary', 'kyle', 'noah', 'alan',
      'ethan', 'jeremy', 'lionel', 'angel', 'walter', 'sean', 'carl',
      'harold', 'liam', 'mason', 'ethan', 'noah', 'william', 'james',
      'oliver', 'benjamin', 'elijah', 'lucas', 'henry', 'alexander',
      'jackson', 'sebastian', 'aiden', 'matthew', 'samuel', 'david',
      'joseph', 'carter', 'owen', 'wyatt', 'john', 'jack', 'luke',
      'jayden', 'dylan', 'grayson', 'levi', 'isaac', 'gabriel', 'julian',
      'mateo', 'anthony', 'jaxon', 'lincoln', 'joshua', 'christopher',
      'andrew', 'theodore', 'caleb', 'ryan', 'asher', 'nathan', 'thomas',
      'leo', 'isaiah', 'charles', 'josiah', 'hudson', 'christian', 'hunter',
      'connor', 'eli', 'ezra', 'aaron', 'landon', 'adrian', 'jonathan',
      'nolan', 'jeremiah', 'easton', 'elias', 'colton', 'cameron', 'carson',
      'robert', 'angel', 'maverick', 'nicholas', 'dominic', 'jaxson',
      'greyson', 'adam', 'ian', 'austin', 'santiago', 'jordan', 'cooper',
      'brayden', 'roman', 'evan', 'ezekiel', 'xavier', 'jose', 'jace',
      'jameson', 'leonardo', 'bryson', 'axel', 'everett', 'parker', 'kayden',
      'miles', 'sawyer', 'jason', 'declan', 'weston', 'micah', 'ayden',
      'wesley', 'luca', 'vincent', 'damian', 'zachary', 'silas', 'gavin',
      'chase', 'kai', 'emmanuel', 'diego', 'matias', 'joel', 'michael',
      'ricardo', 'sebastian', 'miguel', 'antonio', 'alejandro', 'wayne',
      'alan', 'jesse', 'blake', 'carlos', 'juan', 'luis', 'victor',
      'manuel', 'francisco', 'marcos', 'leonardo', 'edwin', 'sergio',
      'adrian', 'oscar', 'rafael', 'jorge', 'mario', 'fernando', 'cesar',
      'ricardo', 'roberto', 'arturo', 'enrique', 'salvador', 'eduardo',
      'javier', 'alberto', 'alfredo', 'armando', 'julio', 'raul', 'angel',
      'guillermo', 'jesus', 'alejandro', 'gerardo', 'pablo', 'hugo',
      'rodrigo', 'ernesto', 'lorenzo', 'felipe', 'ignacio', 'emilio',
      'gabriel', 'daniel', 'andres', 'martin', 'antonio', 'ruben',
      'fabian', 'gonzalo', 'mauricio', 'esteban', 'nicolas', 'santiago',
      'tomas', 'ivan', 'carlos', 'cristian', 'raul', 'felipe', 'diego',
      'valentin', 'mateo', 'lucas', 'samuel', 'benjamin', 'nicolas',
      'alejandro', 'angel', 'adrian', 'emilio', 'sergio', 'pablo',
      'rafael', 'jose', 'mario', 'oscar', 'fernando', 'alberto',
      'ricardo', 'manuel', 'antonio', 'francisco', 'juan', 'luis',
      'miguel', 'carlos', 'jorge', 'arturo', 'eduardo', 'enrique',
      'salvador', 'javier', 'alfredo', 'armando', 'cesar', 'roberto',
      'julio', 'raul', 'guillermo', 'jesus', 'gerardo', 'hugo',
      'rodrigo', 'ernesto', 'lorenzo', 'felipe', 'ignacio', 'emilio',
      'gabriel', 'daniel', 'andres', 'martin', 'ruben', 'fabian',
      'gonzalo', 'mauricio', 'esteban', 'ivan', 'cristian', 'tomas',
      'valentin', 'mateo', 'lucas', 'samuel', 'benjamin', 'nicolas',
      // African names
      'adebayo', 'oluwaseun', 'kehinde', 'taiwo', 'ayo', 'bola', 'tunde',
      'wale', 'femi', 'kola', 'seun', 'kunle', 'lanre', 'dele', 'jide',
      'tayo', 'gbenga', 'tobi', 'dayo', 'tunji', 'yomi', 'bayo', 'kayode',
      'bode', 'tolu', 'deji', 'segun', 'kemi', 'yemi', 'dare', 'niyi',
      'biodun', 'rotimi', 'adeniyi', 'olumide', 'adebayo', 'oluwaseun',
      'adebisi', 'oluwakemi', 'oluwafunmi', 'oluwayemi', 'oluwabukola',
      'ibrahim', 'mohammed', 'abdul', 'hassan', 'hussain', 'ali', 'omar',
      'ahmed', 'yusuf', 'ismail', 'musa', 'idris', 'usman', 'suleiman',
      'abubakar', 'haruna', 'garba', 'bello', 'shehu', 'aliyu', 'muhammad',
      'sani', 'abdullahi', 'ibrahim', 'umar', 'salisu', 'murtala', 'bashir',
      'nasir', 'aminu', 'mahmud', 'yakubu', 'isah', 'adamu', 'hassan',
      'lawal', 'musa', 'danjuma', 'tanko', 'bala', 'audu', 'ibrahim',
      'mohammed', 'ahmad', 'yusuf', 'ismail', 'musa', 'idris', 'usman',
      'suleiman', 'abubakar', 'haruna', 'garba', 'bello', 'shehu', 'aliyu',
      'muhammad', 'sani', 'abdullahi', 'ibrahim', 'umar', 'salisu'
    ];

    // Common female name endings
    const femaleEndings = ['a', 'e', 'ia', 'ina', 'ika', 'ola', 'ette', 'elle', 'ine', 'ique', 'iya', 'ara', 'lyn', 'lynn', 'ana', 'ica', 'isa', 'ita', 'iza', 'ova', 'eva', 'ava'];
    
    // Common male name endings
    const maleEndings = ['o', 'er', 'on', 'an', 'en', 'ar', 'or', 'us', 'is', 'es', 'os', 'as', 'un', 'in', 'el', 'al', 'il', 'ul', 'ey', 'ay', 'oy', 'uy'];

    // Direct name match
    if (femalePatterns.includes(name)) {
      return 'female';
    }
    
    if (malePatterns.includes(name)) {
      return 'male';
    }

    // Pattern matching by endings
    const femaleScore = femaleEndings.reduce((score, ending) => {
      return score + (name.endsWith(ending) ? 1 : 0);
    }, 0);

    const maleScore = maleEndings.reduce((score, ending) => {
      return score + (name.endsWith(ending) ? 1 : 0);
    }, 0);

    if (femaleScore > maleScore) {
      return 'female';
    } else if (maleScore > femaleScore) {
      return 'male';
    }

    return 'neutral';
  }

  /**
   * Generates an SVG avatar based on user data
   */
  generateDefaultAvatar(firstName: string, lastName: string, gender?: string): string {
    const initials = `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
    
    // Determine gender if not provided
    const detectedGender = gender || this.detectGenderFromName(firstName);
    
    // Color schemes based on gender
    const colorSchemes = {
      female: [
        { bg: '#EC4899', text: '#FFFFFF' }, // Pink
        { bg: '#8B5CF6', text: '#FFFFFF' }, // Purple
        { bg: '#06B6D4', text: '#FFFFFF' }, // Cyan
        { bg: '#10B981', text: '#FFFFFF' }, // Emerald
        { bg: '#F59E0B', text: '#FFFFFF' }, // Amber
        { bg: '#EF4444', text: '#FFFFFF' }, // Red
        { bg: '#8B5A2B', text: '#FFFFFF' }, // Brown
        { bg: '#6366F1', text: '#FFFFFF' }, // Indigo
      ],
      male: [
        { bg: '#3B82F6', text: '#FFFFFF' }, // Blue
        { bg: '#1F2937', text: '#FFFFFF' }, // Gray
        { bg: '#059669', text: '#FFFFFF' }, // Green
        { bg: '#DC2626', text: '#FFFFFF' }, // Red
        { bg: '#7C2D12', text: '#FFFFFF' }, // Brown
        { bg: '#1E40AF', text: '#FFFFFF' }, // Dark Blue
        { bg: '#991B1B', text: '#FFFFFF' }, // Dark Red
        { bg: '#374151', text: '#FFFFFF' }, // Dark Gray
      ],
      neutral: [
        { bg: '#6B7280', text: '#FFFFFF' }, // Gray
        { bg: '#4B5563', text: '#FFFFFF' }, // Dark Gray
        { bg: '#374151', text: '#FFFFFF' }, // Darker Gray
        { bg: '#1F2937', text: '#FFFFFF' }, // Very Dark Gray
        { bg: '#111827', text: '#FFFFFF' }, // Almost Black
        { bg: '#F59E0B', text: '#FFFFFF' }, // Amber
        { bg: '#10B981', text: '#FFFFFF' }, // Emerald
        { bg: '#8B5CF6', text: '#FFFFFF' }, // Purple
      ]
    };

    // Select color scheme based on gender
    const schemes = colorSchemes[detectedGender as keyof typeof colorSchemes] || colorSchemes.neutral;
    
    // Use initials to consistently select a color (same initials = same color)
    const colorIndex = (initials.charCodeAt(0) + initials.charCodeAt(1)) % schemes.length;
    const selectedScheme = schemes[colorIndex];

    // Generate SVG
    const svg = `
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="${selectedScheme.bg}"/>
        <text x="50" y="58" text-anchor="middle" fill="${selectedScheme.text}" font-family="Arial, sans-serif" font-size="32" font-weight="bold">${initials}</text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * Updates user profile with default avatar if none exists
   */
  async ensureUserHasAvatar(userId: number): Promise<void> {
    try {
      const user = await this.storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Only generate avatar if user doesn't have one
      if (!user.profilePicture) {
        const avatar = this.generateDefaultAvatar(
          user.firstName,
          user.lastName,
          user.gender || undefined
        );

        await this.storage.updateUser(userId, {
          profilePicture: avatar
        });
      }
    } catch (error) {
      console.error('Error ensuring user has avatar:', error);
      throw error;
    }
  }

  /**
   * Updates user's gender and regenerates avatar if needed
   */
  async updateUserGender(userId: number, gender: 'male' | 'female' | 'other'): Promise<void> {
    try {
      const user = await this.storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update gender
      await this.storage.updateUser(userId, { gender });

      // Regenerate avatar if user is using default avatar (starts with data:image/svg+xml)
      if (user.profilePicture && user.profilePicture.startsWith('data:image/svg+xml')) {
        const newAvatar = this.generateDefaultAvatar(
          user.firstName,
          user.lastName,
          gender
        );

        await this.storage.updateUser(userId, {
          profilePicture: newAvatar
        });
      }
    } catch (error) {
      console.error('Error updating user gender:', error);
      throw error;
    }
  }

  /**
   * Regenerates default avatar for user
   */
  async regenerateDefaultAvatar(userId: number): Promise<string> {
    try {
      const user = await this.storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const avatar = this.generateDefaultAvatar(
        user.firstName,
        user.lastName,
        user.gender || undefined
      );

      await this.storage.updateUser(userId, {
        profilePicture: avatar
      });

      return avatar;
    } catch (error) {
      console.error('Error regenerating default avatar:', error);
      throw error;
    }
  }
}