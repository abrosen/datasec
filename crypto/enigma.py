from crypto_tools import phi, psi, phi2, getFreqs


class Rotor(object):
    def __init__(self):
        self.inv = False
        self.mod = -1
        self.ins =  []
        self.outs = []

    def turnover(self, i):
        i = i + 1
        if i >= self.mod:
            i %= mod
            return i, True
        return i, False

    def symbolFromIndex(self,index):
        return ins[index]

    def isInverter(self):
        return self.inv


    def load(self, ins, outs, inv):
        """
        Loads the rotor with the proper ins and outs
        rejects if the mapping is bad
        """
        print ins
        print outs
        self.inv = inv

        if not len(ins) == len(outs):
            return False
        #if set(list(ins)).issubset(list(set(outs))):
        #    print set(ins), set(outs)
            return False
        if inv: 
            for i,j in zip(ins,outs):
                if i == j:
                    print i,j
                    return False

        # It passed
        self.mod = len(ins)
        self.inv = inv

        if not inv:
            self.ins =  list(ins)
            self.outs =  list(outs)
            return True

        else:
            self.ins =  list(ins)
            self.outs =  ['\x00']*self.mod
            for i in range(0,self.mod):
                if self.outs[i] != '\x00':
                    continue
                if self.outs[self.ins.index(outs[i])] != '\x00':
                    continue 
                self.outs[i] = outs[i]
                for j in xrange(0, self.mod):
                    if self.ins[j] == self.outs[i]:
                        if self.outs[j] != '\x00':
                            continue
                        self.outs[j]= self.ins[i]
                        break
            for i in range(0,self.mod):
                if self.outs[i] == '\x00':
                    self.outs[i] = self.ins[i]
            print self.ins
            print self.outs

    def forward(self,char, offset):
        if self.isInverter():
            offset = 0
        outIndex = self.ins.index(char)
        outIndex += offset
        outIndex = outIndex % self.mod
        return self.outs[outIndex]

    def reverse(self, char, offset):
        if self.isInverter():
            offset = 0
        inIndex = self.outs.index(char)
        inIndex -= offset
        inIndex = inIndex % self.mod
        return self.ins(inIndex)









corpus  =  open("cipher.problem.2").read()

r = Rotor()
print r.load("abcdefghijklmnopqrstuvwxyz", "zyabcdefghijklmnopqrstxwuv",True)

"""
("abcdefghijklmnopqrstuvwxyz", "abcghidefjklpqrmnostxyzuvw",False), 
("abcdefghijklmnopqrstuvwxyz", "defghijklmnopqrstuvwxyzabc",False), 
("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklnmpqosrtuvway",False), 
("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklosrtuvwaynmpq",False), 
("abcdefghijklmnopqrstuvwxyz", "abcghidefjklpqrmnostxyzuvw",False), 
("abcdefghijklmnopqrstuvwxyz", "defghijklmnopqrstuvwxyzabc",False), 
("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklnmpqosrtuvway",False), 
("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklosrtuvwaynmpq",False), 
("abcdefghijklmnopqrstuvwxyz", "abcghidefjklpqrmnostxyzuvw",False), 
("abcdefghijklmnopqrstuvwxyz", "zyabcdefghijklmnopqrstxwuv",True)
""" 
