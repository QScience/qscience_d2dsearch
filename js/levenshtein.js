/* Levenshtein String Distance */

// calculate the Levenshtein distance between a and b, fob = form object, passed to the function
function levenshtein(a, b) {
    var cost, m, n, tmp;
    var r, i, j;

    a = a.trim();
    b = b.trim();

    lenA = a.length;
    lenB = b.length;

    // make sure a.length >= b.length to use O(min(n,m)) space, whatever that is
    if (m < n) {
	tmp = a, a = b, b = tmp;
	tmp = lenA, m = n, n = lenB;
    }

    r = [];
    r[0] = [];
    for (tmp = 0; tmp < lenB + 1; tmp++) {
	r[0][tmp] = tmp;
    }

    for (i = 1; i < lenA + 1; i++) {
	r[i] = [];
	r[i][0] = i;
	for (j = 1; j < lenB + 1; j++) {
	    cost = (a.charAt(i-1) == b.charAt(j-1)) ? 0 : 1;
	    r[i][j] = minimator(r[i-1][j] + 1, r[i][j-1] + 1, r[i-1][j-1] + cost);
	}
    }

    return r[lenA][lenB];
}

// Returns the smallest of three values.
function minimator(x, y, z) {
    if (x < y && x < z) return x;
    if (y < x && y < z) return y;
    return z;
}
