/**
 * The bit size of a single word, which is uint32.
 * @readonly
 * @static
 */
const BITS_PER_WORD = 32;
/**
 * The hamming table used for cardinality calculation.
 * @readonly
 * @static
 */
const HAMMING_TABLE = [
  0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4,
];

/**
 * Implements an array of bits that grows by itself. Each bit is a boolean,
 * and its index is non-negative integer.
 * Basically it's Javascript implementation of Java's BitSet.
 * @constructor
 * @param [value] - Initial value for the BitSet.
 */
export default class BitSet implements Set<number> {
  words: number[];

  constructor(value?: BitSet | number | null) {
    if (value instanceof BitSet) {
      this.words = value.words.slice();
    } else if (value != null) {
      this.words = new Array(value);
      for (let i = 0; i < value; i += 1) {
        this.words[i] = 0;
      }
    } else {
      this.words = [0];
    }
  }

  /**
   * Sets specified range of bits to false.
   * @param from {Number} - The start bit position.
   * @param to {Number} - The end bit position.
   * @see {@link BitSet#setRange}
   */
  clearRange(from: number, to: number): void {
    this.setRange(from, to, false);
  }

  add(value: number): this {
    this.set(value, true);
    return this;
  }

  clear(): void {
    for (let i = 0; i < this.words.length; i += 1) {
      this.words[i] = 0;
    }
  }

  delete(value: number): boolean {
    this.set(value, false);
    // TODO check
    return true;
  }

  /**
   * Sets specified bit.
   * @param pos {Number} - The bit position to set.
   * @param set {Boolean} - The value to set.
   */
  set(pos: number, set: number | boolean = true): void {
    const wordPos = pos / BITS_PER_WORD | 0;
    const shiftPos = (pos % BITS_PER_WORD);
    if (this.words.length <= wordPos) {
      this.words[wordPos] = 0;
    }
    if (set) {
      this.words[wordPos] |= 1 << shiftPos;
    } else {
      this.words[wordPos] &= ~(1 << shiftPos);
    }
  }

  /**
   * Sets specified range of bits.
   * @param from {Number} - The start bit position.
   * @param to {Number} - The end bit position.
   * @param set {Boolean} - The value to set.
   */
  setRange(from: number, to: number, set: number | boolean = true): void {
    const startWord = from / BITS_PER_WORD | 0;
    const endWord = to / BITS_PER_WORD | 0;
    for (let i = startWord; i <= endWord; i += 1) {
      if (this.words.length <= i) {
        this.words[i] = 0;
      }
      if (i === startWord && i === endWord) {
        const fromPos = (from % BITS_PER_WORD);
        const toPos = (to % BITS_PER_WORD);
        let word = this.words[i];
        for (let j = fromPos; j < toPos; j += 1) {
          if (set) {
            word |= 1 << j;
          } else {
            word &= ~(1 << j);
          }
        }
        this.words[i] = word;
      } else if (i === startWord) {
        const fromPos = (from % BITS_PER_WORD);
        let word = this.words[i];
        for (let j = fromPos; j < BITS_PER_WORD; j += 1) {
          if (set) {
            word |= 1 << j;
          } else {
            word &= ~(1 << j);
          }
        }
        this.words[i] = word;
      } else if (i === endWord) {
        const toPos = (to % BITS_PER_WORD);
        let word = this.words[i];
        for (let j = 0; j < toPos; j += 1) {
          if (set) {
            word |= 1 << j;
          } else {
            word &= ~(1 << j);
          }
        }
        this.words[i] = word;
      } else {
        this.words[i] = set ? ~0 : 0;
      }
    }
  }

  /**
   * Sets all bits.
   * @param set {Boolean} - The value to set.
   */
  setAll(set: number | boolean = true): void {
    let val = 0;
    if (set) val = ~0;
    for (let i = 0; i < this.words.length; i += 1) {
      this.words[i] = val;
    }
  }


  has(value: number): boolean {
    return this.get(value);
  }

  /**
   * Returns the value of specified bit.
   * @param pos {Number} - The bit position.
   * @returns {Boolean} Whether if the bit is set or not.
   */
  get(pos: number): boolean {
    const wordPos = pos / BITS_PER_WORD | 0;
    if (this.words.length <= wordPos) return false;
    const shiftPos = (pos % BITS_PER_WORD);
    return (this.words[wordPos] & (1 << shiftPos)) !== 0;
  }

  /**
   * Performs AND logical operation on two BitSet.
   * That means it will be set to 1 if both are 1, 0 otherwise.
   * The result will be applied to this BitSet.
   * @param set {BitSet} - The other BitSet.
   */
  and(set?: BitSet | null): void {
    if (set == null) {
      this.clear();
      return;
    }
    const intersectSize = Math.min(this.words.length, set.words.length);
    const unionSize = Math.max(this.words.length, set.words.length);
    for (let i = 0; i < unionSize; i += 1) {
      if (i > intersectSize) {
        this.words[i] = 0;
      } else {
        this.words[i] &= set.words[i];
      }
    }
  }

  /**
   * Performs OR logical operation on two BitSet.
   * That means it will be set to 1 if one of them is 1, 0 if both are 0.
   * The result will be applied to this BitSet.
   * @param set {BitSet} - The other BitSet.
   */
  or(set?: BitSet | null): void {
    if (set == null) return;
    const unionSize = Math.max(this.words.length, set.words.length);
    for (let i = 0; i < unionSize; i += 1) this.words[i] |= set.words[i];
  }

  /**
   * Performs XOR logical operation on two BitSet.
   * That means it will be set to 1 if the bits are different, 0 if same.
   * The result will be applied to this BitSet.
   * @param set {BitSet} - The other BitSet.
   */
  xor(set?: BitSet | null): void {
    if (set == null) return;
    const unionSize = Math.max(this.words.length, set.words.length);
    for (let i = 0; i < unionSize; i += 1) this.words[i] ^= set.words[i];
  }

  /**
   * Performs NOT logical operation on the BitSet.
   * That means it will be set to 1 if bit is 0, 0 otherwise.
   * The result will be applied to this BitSet.
   */
  not(): void {
    for (let i = 0; i < this.words.length; i += 1) {
      this.words[i] = ~this.words[i];
    }
  }

  /**
   * Checkes whether the BitSet is filled with 0.
   * This function will return false if the BitSet has any bit that is set to 1.
   * @returns {Boolean} Whether if the BitSet is empty.
   */
  isEmpty(): boolean {
    for (let i = 0; i < this.words.length; i += 1) {
      if (this.words[i]) return false;
    }
    return true;
  }

  /**
   * Checks if two BitSet has a same bit to set to 1.
   * This function will return true if they have matching part, false otherwise.
   * @param set - The other BitSet.
   * @returns {Boolean} Whether if two BitSet intersects.
   */
  intersects(set?: BitSet | null): boolean {
    if (set == null) return false;
    const intersectSize = Math.min(this.words.length, set.words.length);
    for (let i = 0; i < intersectSize; i += 1) {
      if (this.words[i] & set.words[i]) return true;
    }
    return false;
  }

  /**
   * Checks if this BitSet contains all the bits from the other BitSet.
   * @param set - The other BitSet.
   * @returns {Boolean} Whether if two BitSet intersects.
   */
  contains(set?: BitSet | null): boolean {
    if (set == null) return false;
    const intersectSize = Math.min(this.words.length, set.words.length);
    for (let i = 0; i < intersectSize; i += 1) {
      if ((this.words[i] & set.words[i]) !== set.words[i]) return false;
    }
    return true;
  }

  /**
   * Checks if two BitSet is same.
   * This function will return true if they are same, false otherwise.
   * @param set - The other BitSet.
   * @returns {Boolean} Whether if two BitSet equals.
   */
  equals(set?: BitSet | null): boolean {
    if (set == null || !(set instanceof BitSet)) return false;
    const intersectSize = Math.min(this.words.length, set.words.length);
    const unionSize = Math.max(this.words.length, set.words.length);
    for (let i = 0; i < unionSize; i += 1) {
      if (i > intersectSize) {
        if (set.words[i] || this.words[i]) return false;
      } else if (this.words[i] !== set.words[i]) return false;
    }
    return true;
  }

  /**
   * Returns the number of bits that has set to true in this BitSet.
   * @returns {Number} The number of bits that has set to true.
   */
  cardinality(): number {
    let count = 0;
    for (let i = 0; i < this.words.length; i += 1) {
      const word = this.words[i];
      count += HAMMING_TABLE[word & 0xF];
      count += HAMMING_TABLE[(word >>> 4) & 0xF];
      count += HAMMING_TABLE[(word >>> 8) & 0xF];
      count += HAMMING_TABLE[(word >>> 12) & 0xF];
      count += HAMMING_TABLE[(word >>> 16) & 0xF];
      count += HAMMING_TABLE[(word >>> 20) & 0xF];
      count += HAMMING_TABLE[(word >>> 24) & 0xF];
      count += HAMMING_TABLE[(word >>> 28) & 0xF];
    }
    return count;
  }

  /**
   * Changes the BitSet to String form.
   * @param {Number} [radix=2] - The redix to use.
   * @returns {String} The stringified BitSet.
   */
  toString(radix: number = 2): string {
    const map = [];
    for (let i = 0; i < this.words.length; i += 1) {
      const value = this.words[i];
      map.push(value.toString(radix || 2));
    }
    return map.reverse().join(' ');
  }

  compare(set: BitSet): number {
    const intersectSize = Math.min(this.words.length, set.words.length);
    for (let i = 0; i < intersectSize; i += 1) {
      const b = set.words[i];
      const a = this.words[i];
      if (a < b) return 1;
      if (a > b) return -1;
    }
    return 0;
  }

  hashCode(): number {
    let hash = 17;
    for (let i = 0; i < this.words.length; i += 1) {
      hash = hash * 17 + this.words[i] | 0;
    }
    return hash;
  }

  forEach(
    callback: (value: number, value2: number, set: this) => void,
    thisArg?: any,
  ): void {
    for (const key of this.keys()) {
      callback.call(thisArg, key, key, this);
    }
  }
  
  /** Iterates over values in the set. */
  [Symbol.iterator](): IterableIterator<number> {
    return this.keys();
  }

  /**
   * Returns an iterable of [v,v] pairs for every value `v` in the set.
   */
  * entries(): IterableIterator<[number, number]> {
    for (const key of this.keys()) {
      yield [key, key];
    }
  }

  /**
   * Despite its name, returns an iterable of the values in the set,
   */
  * keys(): IterableIterator<number> {
    for (let i = 0; i < this.words.length; i += 1) {
      let word = this.words[i];
      let pos = i * BITS_PER_WORD;
      while (word !== 0) {
        if (word & 1) yield pos;
        word >>= 1;
        pos += 1;
      }
    }
  }

  /**
   * Returns an iterable of values in the set.
   */
  values(): IterableIterator<number> {
    return this.keys();
  }
}
